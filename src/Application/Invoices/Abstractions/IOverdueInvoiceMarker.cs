namespace Application.Invoices.Abstractions;

public interface IOverdueInvoiceMarker
{
    Task<int> MarkOverdueInvoicesAsync(DateOnly asOfDate, CancellationToken cancellationToken);
}
