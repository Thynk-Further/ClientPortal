using Application.Abstractions;
using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class MarkThreadDeliveredCommandHandler : IRequestHandler<MarkThreadDeliveredCommand, Result<int>>
{
    private static readonly Error ThreadNotFoundError = new(
        "Messages.ThreadNotFound",
        "Message thread was not found.",
        ErrorType.NotFound);

    private static readonly Error RecipientNotParticipantError = new(
        "Messages.RecipientNotParticipant",
        "Recipient is not a participant in this thread.",
        ErrorType.Forbidden);

    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IRealtimeMessagingService _realtimeMessagingService;
    private readonly IUnitOfWork _unitOfWork;

    public MarkThreadDeliveredCommandHandler(
        IMessageThreadRepository messageThreadRepository,
        IMessageRepository messageRepository,
        IRealtimeMessagingService realtimeMessagingService,
        IUnitOfWork unitOfWork)
    {
        _messageThreadRepository = messageThreadRepository;
        _messageRepository = messageRepository;
        _realtimeMessagingService = realtimeMessagingService;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(MarkThreadDeliveredCommand request, CancellationToken cancellationToken)
    {
        MessageThread? thread = await _messageThreadRepository.FindByIdAsync(request.ThreadId, cancellationToken);
        if (thread is null)
        {
            return Result<int>.Failure(ThreadNotFoundError);
        }

        if (!thread.Participants.Contains(request.RecipientId))
        {
            return Result<int>.Failure(RecipientNotParticipantError);
        }

        IReadOnlyList<Message> undeliveredMessages = await _messageRepository.GetUndeliveredMessagesForRecipientAsync(
            request.ThreadId,
            request.RecipientId,
            cancellationToken);

        DateTime deliveredAt = DateTime.UtcNow;
        foreach (Message message in undeliveredMessages)
        {
            message.MarkDelivered(deliveredAt);
        }

        if (undeliveredMessages.Count > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _realtimeMessagingService.BroadcastDeliveryReceiptAsync(
                new RealtimeDeliveryReceiptPayload(
                    request.ThreadId,
                    request.RecipientId,
                    undeliveredMessages.Count,
                    deliveredAt),
                cancellationToken);
        }

        return Result<int>.Success(undeliveredMessages.Count);
    }
}
