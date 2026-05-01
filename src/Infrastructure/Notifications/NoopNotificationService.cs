using Application.Notifications.Abstractions;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Notifications;

public sealed class NoopNotificationService : INotificationService
{
    private readonly ILogger<NoopNotificationService> _logger;

    public NoopNotificationService(ILogger<NoopNotificationService> logger)
    {
        _logger = logger;
    }

    public Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default)
    {
        _ = cancellationToken;
        _logger.LogInformation(
            "Notification queued. Channel: {Channel}, Recipient: {Recipient}, Subject: {Subject}",
            message.Channel,
            message.Recipient,
            message.Subject);
        return Task.CompletedTask;
    }
}
