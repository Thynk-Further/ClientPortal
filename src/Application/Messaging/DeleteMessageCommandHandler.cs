using Application.Abstractions;
using Application.Messaging.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class DeleteMessageCommandHandler : IRequestHandler<DeleteMessageCommand, Result>
{
    private static readonly Error ThreadNotFoundError = new(
        "Messages.ThreadNotFound",
        "Message thread was not found.",
        ErrorType.NotFound);

    private static readonly Error ActorNotParticipantError = new(
        "Messages.ActorNotParticipant",
        "Actor is not a participant in this thread.",
        ErrorType.Forbidden);

    private static readonly Error MessageNotFoundError = new(
        "Messages.MessageNotFound",
        "Message was not found in this thread.",
        ErrorType.NotFound);

    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly ICurrentTenant _currentTenant;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteMessageCommandHandler(
        IMessageThreadRepository messageThreadRepository,
        IMessageRepository messageRepository,
        ICurrentTenant currentTenant,
        IUnitOfWork unitOfWork)
    {
        _messageThreadRepository = messageThreadRepository;
        _messageRepository = messageRepository;
        _currentTenant = currentTenant;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteMessageCommand request, CancellationToken cancellationToken)
    {
        MessageThread? thread = await _messageThreadRepository.FindByIdAsync(request.ThreadId, cancellationToken);
        if (thread is null)
        {
            return Result.Failure(ThreadNotFoundError);
        }

        if (!thread.Participants.Contains(request.ActorId))
        {
            return Result.Failure(ActorNotParticipantError);
        }

        Message? message = await _messageRepository.FindByIdAsync(request.MessageId, cancellationToken);
        if (message is null || message.ThreadId != request.ThreadId)
        {
            return Result.Failure(MessageNotFoundError);
        }

        DateTime nowUtc = DateTime.UtcNow;
        if (request.IsModerationAction && (_currentTenant.Settings?.EnableMessageModerationAudit ?? true))
        {
            message.MarkModerated(request.ActorId, request.Reason, nowUtc);
        }

        message.SoftDelete(request.ActorId, request.Reason, nowUtc);
        _messageRepository.Update(message);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
