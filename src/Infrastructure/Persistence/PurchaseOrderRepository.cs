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

        IQueryable<Client> clients = _tenantDbContext.Set<Client>().AsNoTracking();
        IQueryable<Rfq> rfqs = _tenantDbContext.Set<Rfq>().AsNoTracking();

        IReadOnlyList<PurchaseOrderListItemDto> items = await (
            from po in query
            join client in clients on po.ClientId equals client.Id
            join rfq in rfqs on po.RfqId equals rfq.Id into rfqJoin
            from rfq in rfqJoin.DefaultIfEmpty()
            orderby po.CreatedAt descending
            select new PurchaseOrderListItemDto(
                po.Id,
                po.ClientId,
                client.CompanyName,
                po.ProjectId,
                po.PoNumber,
                po.QuotationId,
                po.RfqId,
                rfq != null ? rfq.RfqNumber : null,
                rfq != null ? rfq.Title : null,
                po.Status,
                po.Total,
                po.Currency,
                po.GeneratedInvoiceId,
                po.CreatedAt,
                po.UpdatedAt))
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
