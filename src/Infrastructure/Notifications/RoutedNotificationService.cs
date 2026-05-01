using Application.Notifications.Abstractions;
using Application.Notifications.Dtos;
using Domain;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Notifications;

public sealed class RoutedNotificationService : INotificationService
{
    private readonly IReadOnlyDictionary<NotificationChannel, INotificationChannelHandler> _handlers;
    private readonly INotificationPreferencesRepository _notificationPreferencesRepository;
    private readonly ILogger<RoutedNotificationService> _logger;

    public RoutedNotificationService(
        IEnumerable<INotificationChannelHandler> handlers,
        INotificationPreferencesRepository notificationPreferencesRepository,
        ILogger<RoutedNotificationService> logger)
    {
        _handlers = handlers.ToDictionary(handler => handler.Channel);
        _notificationPreferencesRepository = notificationPreferencesRepository;
        _logger = logger;
    }

    public async Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default)
    {
        if (!_handlers.TryGetValue(message.Channel, out INotificationChannelHandler? handler))
        {
            _logger.LogInformation(
                "No notification handler registered for channel {Channel}. Recipient {Recipient} skipped.",
                message.Channel,
                message.Recipient);
            return;
        }

        if (TryResolveUserId(message, out Guid userId))
        {
            NotificationPreferencesDto preferences = await _notificationPreferencesRepository
                .GetOrDefaultAsync(userId, cancellationToken);

            if (preferences.Frequency is NotificationPreferenceFrequency.Off or NotificationPreferenceFrequency.Digest)
            {
                _logger.LogInformation(
                    "Notification for user {UserId} skipped because preference frequency is {Frequency}.",
                    userId,
                    preferences.Frequency);
                return;
            }

            if (!IsChannelEnabled(preferences, message.Channel))
            {
                _logger.LogInformation(
                    "Notification for user {UserId} skipped because channel {Channel} is disabled.",
                    userId,
                    message.Channel);
                return;
            }
        }

        await handler.SendAsync(message, cancellationToken);
    }

    private static bool TryResolveUserId(NotificationMessage message, out Guid userId)
    {
        userId = Guid.Empty;

        if (message.Metadata is not null
            && message.Metadata.TryGetValue("userId", out string? metadataUserId)
            && Guid.TryParse(metadataUserId, out userId))
        {
            return true;
        }

        if (Guid.TryParse(message.Recipient, out userId))
        {
            return true;
        }

        return false;
    }

    private static bool IsChannelEnabled(NotificationPreferencesDto preferences, NotificationChannel channel)
    {
        return channel switch
        {
            NotificationChannel.Email => preferences.EmailEnabled,
            NotificationChannel.WhatsApp => preferences.WhatsAppEnabled,
            NotificationChannel.Sms => preferences.SmsEnabled,
            NotificationChannel.InApp => preferences.InAppEnabled,
            _ => false
        };
    }
}
