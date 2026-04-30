using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using MediatR;

namespace Application.Messaging;

public sealed class MessageSentEventHandler : INotificationHandler<MessageSentEvent>
{
    private readonly IMessageRepository _messageRepository;
    private readonly IRealtimeMessagingService _realtimeMessagingService;

    public MessageSentEventHandler(
        IMessageRepository messageRepository,
        IRealtimeMessagingService realtimeMessagingService)
    {
        _messageRepository = messageRepository;
        _realtimeMessagingService = realtimeMessagingService;
    }

    public async Task Handle(MessageSentEvent notification, CancellationToken cancellationToken)
    {
        Message? message = await _messageRepository.FindByIdAsync(notification.MessageId, cancellationToken);
        if (message is null)
        {
            return;
        }

        RealtimeMessagePayload payload = new(
            message.Id,
            message.ThreadId,
            message.SenderId,
            message.SenderRole,
            message.Content,
            message.SequenceNumber,
            message.Status,
            message.SentAt);

        await _realtimeMessagingService.BroadcastMessageAsync(payload, cancellationToken);
    }
}
