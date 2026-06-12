using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class RfqRepository : IRfqRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public RfqRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<PagedResult<RfqListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        RfqStatus? status,
        Guid? clientId,
        CancellationToken cancellationToken)
    {
        IQueryable<Rfq> query = _tenantDbContext.Set<Rfq>().AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(rfq => rfq.Status == status.Value);
        }

        if (clientId.HasValue)
        {
            query = query.Where(rfq => rfq.ClientId == clientId.Value);
        }

        int totalCount = await query.CountAsync(cancellationToken);

        IReadOnlyList<RfqListItemDto> items = await query
            .OrderByDescending(rfq => rfq.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(rfq => new RfqListItemDto(
                rfq.Id,
                rfq.ClientId,
                rfq.ProjectId,
                rfq.RfqNumber,
                rfq.Status,
                rfq.Currency,
                rfq.QuotationId,
                rfq.CreatedAt,
                rfq.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<RfqListItemDto>(items, totalCount, page, pageSize);
    }

    public Task<Rfq?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return _tenantDbContext.Set<Rfq>().SingleOrDefaultAsync(rfq => rfq.Id == id, cancellationToken);
    }

    public Task<int> CountByRfqNumberPrefixAsync(string prefix, CancellationToken cancellationToken)
    {
        return _tenantDbContext.Set<Rfq>()
            .AsNoTracking()
            .CountAsync(rfq => rfq.RfqNumber.StartsWith(prefix), cancellationToken);
    }

    public void Add(Rfq rfq)
    {
        _tenantDbContext.Set<Rfq>().Add(rfq);
    }

    public void Update(Rfq rfq)
    {
        _tenantDbContext.Set<Rfq>().Update(rfq);
    }
}
