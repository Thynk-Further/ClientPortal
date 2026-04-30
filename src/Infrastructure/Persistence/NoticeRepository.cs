using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class NoticeRepository : INoticeRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public NoticeRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<Notice?> FindByIdAsync(Guid noticeId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<Notice>()
            .SingleOrDefaultAsync(notice => notice.Id == noticeId, cancellationToken);
    }

    public async Task<PagedResult<NoticeListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        Guid? clientId,
        bool activeOnly,
        CancellationToken cancellationToken = default)
    {
        DateTime nowUtc = DateTime.UtcNow;
        IQueryable<Notice> query = _tenantDbContext.Set<Notice>().AsNoTracking();

        if (activeOnly)
        {
            query = query.Where(notice => notice.IsActive && (!notice.ExpiresAt.HasValue || notice.ExpiresAt > nowUtc));
        }

        if (clientId.HasValue)
        {
            Guid targetClientId = clientId.Value;
            query = query.Where(notice => notice.TargetClientIds == null || notice.TargetClientIds.Contains(targetClientId));
        }

        int totalCount = await query.CountAsync(cancellationToken);

        IReadOnlyList<NoticeListItemDto> items = await query
            .OrderByDescending(notice => notice.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(notice => new NoticeListItemDto(
                notice.Id,
                notice.Title,
                notice.Content,
                notice.PublishedAt,
                notice.ExpiresAt,
                notice.IsActive,
                notice.TargetClientIds))
            .ToListAsync(cancellationToken);

        return new PagedResult<NoticeListItemDto>(items, totalCount, page, pageSize);
    }

    public void Add(Notice notice)
    {
        _tenantDbContext.Set<Notice>().Add(notice);
    }

    public void Update(Notice notice)
    {
        _tenantDbContext.Set<Notice>().Update(notice);
    }
}
