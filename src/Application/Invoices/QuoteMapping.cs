using Application.Invoices.Dtos;
using Domain;

namespace Application.Invoices;

internal static class QuoteMapping
{
    internal static QuoteDto Map(Quote quote)
    {
        IReadOnlyCollection<InvoiceLineItemDto> lineItems = quote.LineItems
            .Select(lineItem => new InvoiceLineItemDto(
                lineItem.Description,
                lineItem.Quantity,
                lineItem.UnitPrice,
                lineItem.TaxRate,
                lineItem.Amount))
            .ToList()
            .AsReadOnly();

        return new QuoteDto(
            quote.Id,
            quote.ClientId,
            quote.ProjectId,
            quote.QuoteNumber,
            quote.Status,
            lineItems,
            quote.Subtotal,
            quote.TaxAmount,
            quote.Total,
            quote.Currency,
            quote.DueDate,
            quote.Notes,
            quote.ConvertedInvoiceId,
            quote.RfqId,
            quote.PurchaseOrderId,
            quote.Origin,
            quote.CreatedAt,
            quote.UpdatedAt);
    }
}
