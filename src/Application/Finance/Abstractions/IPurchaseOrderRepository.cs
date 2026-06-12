using Application.Finance.Dtos;
using Domain;
using Shared;

namespace Application.Finance.Abstractions;

public interface IPurchaseOrderRepository
{
    Task<PagedResult<PurchaseOrderListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        PurchaseOrderStatus? status,
        Guid? clientId,
        CancellationToken cancellationToken);

    Task<PurchaseOrder?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    void Add(PurchaseOrder purchaseOrder);

    void Update(PurchaseOrder purchaseOrder);
}
