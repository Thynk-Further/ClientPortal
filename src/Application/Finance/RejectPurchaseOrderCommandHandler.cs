using Application.Abstractions;
using Application.Finance.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class RejectPurchaseOrderCommandHandler : IRequestHandler<RejectPurchaseOrderCommand, Result>
{
    private static readonly Error PurchaseOrderNotFoundError = new(
        "PurchaseOrders.NotFound",
        "Purchase order was not found.",
        ErrorType.NotFound);

    private static readonly Error PurchaseOrderInvalidStateError = new(
        "PurchaseOrders.InvalidState",
        "Purchase order cannot be rejected in its current state.",
        ErrorType.Conflict);

    private readonly IPurchaseOrderRepository _purchaseOrderRepository;
    private readonly IUnitOfWork _unitOfWork;

    public RejectPurchaseOrderCommandHandler(
        IPurchaseOrderRepository purchaseOrderRepository,
        IUnitOfWork unitOfWork)
    {
        _purchaseOrderRepository = purchaseOrderRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(RejectPurchaseOrderCommand request, CancellationToken cancellationToken)
    {
        PurchaseOrder? purchaseOrder = await _purchaseOrderRepository.FindByIdAsync(
            request.PurchaseOrderId,
            cancellationToken);

        if (purchaseOrder is null || purchaseOrder.ClientId != request.ClientId)
        {
            return Result.Failure(PurchaseOrderNotFoundError);
        }

        try
        {
            purchaseOrder.Reject();
        }
        catch (InvalidOperationException)
        {
            return Result.Failure(PurchaseOrderInvalidStateError);
        }

        _purchaseOrderRepository.Update(purchaseOrder);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
