using Application.Finance.Dtos;
using Domain;

namespace Application.Finance;

internal static class FinanceMapping
{
    internal static RfqDto Map(Rfq rfq, string clientCompanyName = "", decimal? quotationTotal = null)
    {
        IReadOnlyCollection<RfqLineItemDto> lineItems = rfq.LineItems
            .Select(item => new RfqLineItemDto(item.Description, item.Quantity))
            .ToList()
            .AsReadOnly();

        return new RfqDto(
            rfq.Id,
            rfq.ClientId,
            clientCompanyName,
            rfq.ProjectId,
            rfq.RfqNumber,
            rfq.Title,
            rfq.QuotationDueAtUtc,
            rfq.Status,
            lineItems,
            rfq.Currency,
            rfq.Notes,
            rfq.QuotationId,
            quotationTotal,
            rfq.CreatedAt,
            rfq.UpdatedAt);
    }

    internal static PurchaseOrderDto Map(PurchaseOrder purchaseOrder)
    {
        IReadOnlyCollection<Application.Invoices.Dtos.InvoiceLineItemDto> lineItems = purchaseOrder.LineItems
            .Select(lineItem => new Application.Invoices.Dtos.InvoiceLineItemDto(
                lineItem.Description,
                lineItem.Quantity,
                lineItem.UnitPrice,
                lineItem.TaxRate,
                lineItem.Amount))
            .ToList()
            .AsReadOnly();

        return new PurchaseOrderDto(
            purchaseOrder.Id,
            purchaseOrder.ClientId,
            purchaseOrder.ProjectId,
            purchaseOrder.PoNumber,
            purchaseOrder.QuotationId,
            purchaseOrder.RfqId,
            purchaseOrder.Status,
            lineItems,
            purchaseOrder.Subtotal,
            purchaseOrder.TaxAmount,
            purchaseOrder.Total,
            purchaseOrder.Currency,
            purchaseOrder.ApprovedAt,
            purchaseOrder.GeneratedInvoiceId,
            purchaseOrder.Notes,
            purchaseOrder.CreatedAt,
            purchaseOrder.UpdatedAt);
    }
}
