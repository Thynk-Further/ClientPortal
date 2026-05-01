using Application.Notifications.Dtos;
using Domain;
using Shared;

namespace Application.Notifications.Abstractions;

public interface IInAppNotificationRepository
{
    Task<PagedResult<InAppNotificationItemDto>> GetPagedForUserAsync(
        Guid userId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default);

    Task<InAppNotification?> FindByIdAsync(Guid notificationId, CancellationToken cancellationToken = default);

    void Add(InAppNotification notification);

    void Update(InAppNotification notification);
}
