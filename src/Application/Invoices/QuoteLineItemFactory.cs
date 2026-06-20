using Domain;

namespace Application.Invoices;

internal static class QuoteLineItemFactory
{
    public static List<LineItem> CreateLineItems(
        IEnumerable<(string Description, decimal Quantity, decimal UnitPrice, decimal TaxRate)> items,
        decimal defaultTaxRate)
    {
        return items
            .Select(item => new LineItem(
                item.Description,
                item.Quantity,
                item.UnitPrice,
                item.TaxRate > 0m ? item.TaxRate : defaultTaxRate))
            .ToList();
    }
}
