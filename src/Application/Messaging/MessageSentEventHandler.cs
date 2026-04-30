using Application.Abstractions;
using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using MediatR;

namespace Application.Messaging;

public sealed class MessageSentEventHandler : INotificationHandler<MessageSentEvent>
{
    private static readonly string[] FallbackChannels = ["email", "whatsapp", "sms"];

    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly ICurrentTenant _currentTenant;
    private readonly IUserPresenceService _userPresenceService;
    private readonly IMessageOfflineFallbackNotifier _offlineFallbackNotifier;
    private readonly IRealtimeMessagingService _realtimeMessagingService;

    public MessageSentEventHandler(
        IMessageThreadRepository messageThreadRepository,
        IMessageRepository messageRepository,
        ICurrentTenant currentTenant,
        IUserPresenceService userPresenceService,
        IMessageOfflineFallbackNotifier offlineFallbackNotifier,
        IRealtimeMessagingService realtimeMessagingService)
    {
        _messageThreadRepository = messageThreadRepository;
        _messageRepository = messageRepository;
        _currentTenant = currentTenant;
        _userPresenceService = userPresenceService;
        _offlineFallbackNotifier = offlineFallbackNotifier;
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
            message.ReplyToMessageId,
            message.EmojiReaction,
            message.AttachmentFileName is null
                ? null
                : new MessageAttachmentMetadataDto(
                    message.AttachmentFileName,
                    message.AttachmentContentType ?? string.Empty,
                    message.AttachmentSizeBytes ?? 0,
                    message.AttachmentUrl ?? string.Empty),
            message.AttachmentExpiresAt,
            message.IsSoftDeleted,
            message.DeletedAt,
            message.SequenceNumber,
            message.Status,
            message.SentAt);

        await _realtimeMessagingService.BroadcastMessageAsync(payload, cancellationToken);

        await NotifyOfflineParticipantsAsync(message, cancellationToken);
    }

    private async Task NotifyOfflineParticipantsAsync(Message message, CancellationToken cancellationToken)
    {
        Domain.MessageThread? thread = await _messageThreadRepository.FindByIdAsync(message.ThreadId, cancellationToken);
        if (thread is null)
        {
            return;
        }

        int offlineThresholdSeconds = Math.Max(0, _currentTenant.Settings?.OfflineFallbackThresholdSeconds ?? 0);
        if (offlineThresholdSeconds == 0)
        {
            return;
        }

        string[] enabledChannels = (_currentTenant.Settings?.NotificationChannels ?? [])
            .Where(channel => FallbackChannels.Contains(channel, StringComparer.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        if (enabledChannels.Length == 0)
        {
            return;
        }

        foreach (Guid participantId in thread.Participants.Where(id => id != message.SenderId))
        {
            if (_userPresenceService.IsOnline(participantId))
            {
                continue;
            }

            DateTime? lastSeen = _userPresenceService.GetLastSeenUtc(participantId);
            if (!lastSeen.HasValue || DateTime.UtcNow - lastSeen.Value < TimeSpan.FromSeconds(offlineThresholdSeconds))
            {
                continue;
            }

            await _offlineFallbackNotifier.NotifyRecipientAsync(
                participantId,
                message.ThreadId,
                message.Id,
                enabledChannels,
                cancellationToken);
        }
    }
}
