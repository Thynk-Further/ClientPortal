using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class PurchaseOrderRepository : IPurchaseOrderRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public PurchaseOrderRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<PagedResult<PurchaseOrderListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        PurchaseOrderStatus? status,
        Guid? clientId,
        CancellationToken cancellationToken)
    {
        IQueryable<PurchaseOrder> query = _tenantDbContext.Set<PurchaseOrder>().AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(po => po.Status == status.Value);
        }

        if (clientId.HasValue)
        {
            query = query.Where(po => po.ClientId == clientId.Value);
        }

        int totalCount = await query.CountAsync(cancellationToken);

        IReadOnlyList<PurchaseOrderListItemDto> items = await query
            .OrderByDescending(po => po.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(po => new PurchaseOrderListItemDto(
                po.Id,
                po.ClientId,
                po.ProjectId,
                po.PoNumber,
                po.QuotationId,
                po.RfqId,
                po.Status,
                po.Total,
                po.Currency,
                po.GeneratedInvoiceId,
                po.CreatedAt,
                po.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<PurchaseOrderListItemDto>(items, totalCount, page, pageSize);
    }

    public Task<PurchaseOrder?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return _tenantDbContext.Set<PurchaseOrder>().SingleOrDefaultAsync(po => po.Id == id, cancellationToken);
    }

    public void Add(PurchaseOrder purchaseOrder)
    {
        _tenantDbContext.Set<PurchaseOrder>().Add(purchaseOrder);
    }

    public void Update(PurchaseOrder purchaseOrder)
    {
        _tenantDbContext.Set<PurchaseOrder>().Update(purchaseOrder);
    }
}
