using Application.Abstractions;
using Application.Messaging.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, Result<Guid>>
{
    private static readonly Error ThreadNotFoundError = new(
        "Messages.ThreadNotFound",
        "Message thread was not found.",
        ErrorType.NotFound);

    private static readonly Error SenderNotParticipantError = new(
        "Messages.SenderNotParticipant",
        "Sender is not a participant in this thread.",
        ErrorType.Forbidden);
    
    private static readonly Error IdempotencyPayloadMismatchError = new(
        "Messages.IdempotencyPayloadMismatch",
        "ClientMessageId already exists with different message payload.",
        ErrorType.Conflict);

    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SendMessageCommandHandler(
        IMessageThreadRepository messageThreadRepository,
        IMessageRepository messageRepository,
        IUnitOfWork unitOfWork)
    {
        _messageThreadRepository = messageThreadRepository;
        _messageRepository = messageRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        MessageThread? thread = await _messageThreadRepository.FindByIdAsync(request.ThreadId, cancellationToken);
        if (thread is null)
        {
            return Result<Guid>.Failure(ThreadNotFoundError);
        }

        if (!thread.Participants.Contains(request.SenderId))
        {
            return Result<Guid>.Failure(SenderNotParticipantError);
        }

        Message? existingMessage = await _messageRepository.FindByClientMessageIdAsync(
            request.ThreadId,
            request.ClientMessageId,
            cancellationToken);
        if (existingMessage is not null)
        {
            if (existingMessage.SenderId != request.SenderId
                || !string.Equals(existingMessage.Content, request.Content.Trim(), StringComparison.Ordinal)
                || !string.Equals(existingMessage.SenderRole, request.SenderRole.Trim(), StringComparison.Ordinal))
            {
                return Result<Guid>.Failure(IdempotencyPayloadMismatchError);
            }

            return Result<Guid>.Success(existingMessage.Id);
        }

        long sequenceNumber = await _messageRepository.GetNextSequenceNumberAsync(request.ThreadId, cancellationToken);
        DateTime sentAt = DateTime.UtcNow;

        Message message = Message.Create(
            id: Guid.CreateVersion7(),
            threadId: request.ThreadId,
            senderId: request.SenderId,
            senderRole: request.SenderRole,
            clientMessageId: request.ClientMessageId,
            sequenceNumber: sequenceNumber,
            content: request.Content,
            sentAt: sentAt);

        thread.TouchLastMessageAt(sentAt);
        thread.RaiseMessageSent(message.Id, request.SenderId, sentAt);

        _messageRepository.Add(message);
        _messageThreadRepository.Update(thread);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(message.Id);
    }
}
