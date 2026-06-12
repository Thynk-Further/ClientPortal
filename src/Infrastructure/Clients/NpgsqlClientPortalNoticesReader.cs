using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientPortalNoticesReader : IClientPortalNoticesReader
{
    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientPortalNoticesReader(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<ClientPortalNoticesResultDto> GetNoticesAsync(
        Guid clientId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        DateTime nowUtc = DateTime.UtcNow;

        List<Notice> notices = (await _tenantDbContext.Set<Notice>()
            .AsNoTracking()
            .Where(notice =>
                notice.IsActive
                && (!notice.ExpiresAt.HasValue || notice.ExpiresAt > nowUtc))
            .ToListAsync(cancellationToken))
            .Where(notice => notice.TargetClientIds is null || notice.TargetClientIds.Contains(clientId))
            .OrderByDescending(notice => notice.PublishedAt)
            .ToList();

        Dictionary<Guid, DateTime> readReceipts = await _tenantDbContext.Set<NoticeReadReceipt>()
            .AsNoTracking()
            .Where(receipt => receipt.UserId == userId)
            .ToDictionaryAsync(receipt => receipt.NoticeId, receipt => receipt.ReadAt, cancellationToken);

        List<ClientPortalNoticeListItemDto> items = notices
            .Select(notice => MapNotice(notice, readReceipts))
            .ToList();

        int unreadCount = items.Count(item => !item.IsRead);

        return new ClientPortalNoticesResultDto(items, unreadCount);
    }

    public async Task<ClientPortalNoticesSummaryDto> GetSummaryAsync(
        Guid clientId,
        Guid userId,
        CancellationToken cancellationToken)
    {
        ClientPortalNoticesResultDto notices = await GetNoticesAsync(clientId, userId, cancellationToken);
        return new ClientPortalNoticesSummaryDto(notices.UnreadCount, notices.Notices.Count);
    }

    private static ClientPortalNoticeListItemDto MapNotice(
        Notice notice,
        IReadOnlyDictionary<Guid, DateTime> readReceipts)
    {
        bool isRead = readReceipts.ContainsKey(notice.Id);
        DateTime? readAtUtc = isRead ? readReceipts[notice.Id] : null;

        return new ClientPortalNoticeListItemDto(
            notice.Id,
            notice.Title,
            notice.Content,
            notice.PublishedAt,
            notice.ExpiresAt,
            isRead,
            readAtUtc);
    }
}
