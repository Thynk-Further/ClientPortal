using Application.Notifications.Abstractions;
using Application.Notifications.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class InAppNotificationRepository : IInAppNotificationRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public InAppNotificationRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<PagedResult<InAppNotificationItemDto>> GetPagedForUserAsync(
        Guid userId,
        int page,
        int pageSize,
        bool unreadOnly,
        CancellationToken cancellationToken = default)
    {
        IQueryable<InAppNotification> query = _tenantDbContext.Set<InAppNotification>()
            .AsNoTracking()
            .Where(notification => notification.UserId == userId);

        if (unreadOnly)
        {
            query = query.Where(notification => !notification.IsRead);
        }

        int totalCount = await query.CountAsync(cancellationToken);
        IReadOnlyList<InAppNotificationItemDto> items = await query
            .OrderByDescending(notification => notification.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(notification => new InAppNotificationItemDto(
                notification.Id,
                notification.Title,
                notification.Body,
                notification.MetadataJson,
                notification.IsRead,
                notification.ReadAt,
                notification.CreatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<InAppNotificationItemDto>(items, totalCount, page, pageSize);
    }

    public Task<InAppNotification?> FindByIdAsync(Guid notificationId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<InAppNotification>()
            .SingleOrDefaultAsync(notification => notification.Id == notificationId, cancellationToken);
    }

    public void Add(InAppNotification notification)
    {
        _tenantDbContext.Set<InAppNotification>().Add(notification);
    }

    public void Update(InAppNotification notification)
    {
        _tenantDbContext.Set<InAppNotification>().Update(notification);
    }
}
