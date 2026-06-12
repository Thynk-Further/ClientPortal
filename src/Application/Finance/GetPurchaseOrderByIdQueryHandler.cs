using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetPurchaseOrderByIdQueryHandler
    : IRequestHandler<GetPurchaseOrderByIdQuery, Result<PurchaseOrderDto>>
{
    private static readonly Error PurchaseOrderNotFoundError = new(
        "PurchaseOrders.NotFound",
        "Purchase order was not found.",
        ErrorType.NotFound);

    private readonly IPurchaseOrderRepository _purchaseOrderRepository;

    public GetPurchaseOrderByIdQueryHandler(IPurchaseOrderRepository purchaseOrderRepository)
    {
        _purchaseOrderRepository = purchaseOrderRepository;
    }

    public async Task<Result<PurchaseOrderDto>> Handle(
        GetPurchaseOrderByIdQuery request,
        CancellationToken cancellationToken)
    {
        PurchaseOrder? purchaseOrder = await _purchaseOrderRepository.FindByIdAsync(
            request.PurchaseOrderId,
            cancellationToken);

        if (purchaseOrder is null || purchaseOrder.ClientId != request.ClientId)
        {
            return Result<PurchaseOrderDto>.Failure(PurchaseOrderNotFoundError);
        }

        return Result<PurchaseOrderDto>.Success(FinanceMapping.Map(purchaseOrder));
    }
}
