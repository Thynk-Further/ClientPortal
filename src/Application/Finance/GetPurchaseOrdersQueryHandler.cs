using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetPurchaseOrdersQueryHandler
    : IRequestHandler<GetPurchaseOrdersQuery, Result<GetPurchaseOrdersResultDto>>
{
    private readonly IPurchaseOrderRepository _purchaseOrderRepository;

    public GetPurchaseOrdersQueryHandler(IPurchaseOrderRepository purchaseOrderRepository)
    {
        _purchaseOrderRepository = purchaseOrderRepository;
    }

    public async Task<Result<GetPurchaseOrdersResultDto>> Handle(
        GetPurchaseOrdersQuery request,
        CancellationToken cancellationToken)
    {
        PagedResult<PurchaseOrderListItemDto> purchaseOrders = await _purchaseOrderRepository.GetPagedAsync(
            request.Page,
            request.PageSize,
            request.Status,
            request.ClientId,
            cancellationToken);

        return Result<GetPurchaseOrdersResultDto>.Success(new GetPurchaseOrdersResultDto(purchaseOrders));
    }
}
