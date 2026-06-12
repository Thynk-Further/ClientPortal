using Application.Abstractions;
using Application.Finance.Abstractions;
using Application.Invoices;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class ApprovePurchaseOrderCommandHandler
    : IRequestHandler<ApprovePurchaseOrderCommand, Result<InvoiceDto>>
{
    private static readonly Error PurchaseOrderNotFoundError = new(
        "PurchaseOrders.NotFound",
        "Purchase order was not found.",
        ErrorType.NotFound);

    private static readonly Error PurchaseOrderInvalidStateError = new(
        "PurchaseOrders.InvalidState",
        "Purchase order cannot be approved in its current state.",
        ErrorType.Conflict);

    private readonly IPurchaseOrderRepository _purchaseOrderRepository;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ApprovePurchaseOrderCommandHandler(
        IPurchaseOrderRepository purchaseOrderRepository,
        IInvoiceRepository invoiceRepository,
        IUnitOfWork unitOfWork)
    {
        _purchaseOrderRepository = purchaseOrderRepository;
        _invoiceRepository = invoiceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<InvoiceDto>> Handle(
        ApprovePurchaseOrderCommand request,
        CancellationToken cancellationToken)
    {
        PurchaseOrder? purchaseOrder = await _purchaseOrderRepository.FindByIdAsync(
            request.PurchaseOrderId,
            cancellationToken);

        if (purchaseOrder is null || purchaseOrder.ClientId != request.ClientId)
        {
            return Result<InvoiceDto>.Failure(PurchaseOrderNotFoundError);
        }

        if (purchaseOrder.GeneratedInvoiceId.HasValue)
        {
            return Result<InvoiceDto>.Failure(PurchaseOrderInvalidStateError);
        }

        try
        {
            purchaseOrder.Approve(DateTime.UtcNow);
        }
        catch (InvalidOperationException)
        {
            return Result<InvoiceDto>.Failure(PurchaseOrderInvalidStateError);
        }

        Invoice invoice = Invoice.CreateFromPurchaseOrder(
            Guid.CreateVersion7(),
            purchaseOrder.ClientId,
            purchaseOrder.ProjectId,
            request.InvoiceNumber,
            purchaseOrder.LineItems,
            purchaseOrder.Currency,
            request.DueDate,
            purchaseOrder.Id,
            purchaseOrder.QuotationId,
            purchaseOrder.Notes);

        purchaseOrder.MarkInvoiced(invoice.Id);

        _invoiceRepository.Add(invoice);
        _purchaseOrderRepository.Update(purchaseOrder);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InvoiceDto>.Success(InvoiceMapping.Map(invoice));
    }
}
