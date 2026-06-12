using Application.Invoices.Dtos;
using Domain;

namespace Application.Invoices;

internal static class InvoiceMapping
{
    internal static InvoiceDto Map(Invoice invoice)
    {
        IReadOnlyCollection<InvoiceLineItemDto> lineItems = invoice.LineItems
            .Select(lineItem => new InvoiceLineItemDto(
                lineItem.Description,
                lineItem.Quantity,
                lineItem.UnitPrice,
                lineItem.TaxRate,
                lineItem.Amount))
            .ToList()
            .AsReadOnly();

        return new InvoiceDto(
            invoice.Id,
            invoice.ClientId,
            invoice.ProjectId,
            invoice.InvoiceNumber,
            invoice.Status,
            lineItems,
            invoice.Subtotal,
            invoice.TaxAmount,
            invoice.Total,
            invoice.AmountPaid,
            invoice.Currency,
            invoice.DueDate,
            invoice.PaidAt,
            invoice.Notes,
            invoice.PurchaseOrderId,
            invoice.QuotationId,
            invoice.CreatedAt,
            invoice.UpdatedAt);
    }
}
