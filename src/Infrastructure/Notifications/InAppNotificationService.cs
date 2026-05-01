using Application.Notifications.Abstractions;
using Application.Abstractions;
using Domain;

namespace Infrastructure.Notifications;

public sealed class InAppNotificationService : INotificationChannelHandler
{
    private readonly IInAppNotificationRepository _inAppNotificationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public InAppNotificationService(
        IInAppNotificationRepository inAppNotificationRepository,
        IUnitOfWork unitOfWork)
    {
        _inAppNotificationRepository = inAppNotificationRepository;
        _unitOfWork = unitOfWork;
    }

    public NotificationChannel Channel => NotificationChannel.InApp;

    public async Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(message.Recipient, out Guid recipientUserId) || recipientUserId == Guid.Empty)
        {
            return;
        }

        string metadataJson = "{}";
        if (message.Metadata is not null && message.Metadata.Count > 0)
        {
            metadataJson = System.Text.Json.JsonSerializer.Serialize(message.Metadata);
        }

        InAppNotification notification = InAppNotification.Create(
            Guid.CreateVersion7(),
            recipientUserId,
            message.Subject,
            message.Body,
            metadataJson);

        _inAppNotificationRepository.Add(notification);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
