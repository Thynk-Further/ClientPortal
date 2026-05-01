using Application.Notifications.Abstractions;

namespace Infrastructure.Notifications;

public interface INotificationChannelHandler
{
    NotificationChannel Channel { get; }

    Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default);
}
