using Application.Invoices.Abstractions;
using Microsoft.Extensions.Logging;

namespace Application.Invoices;

public sealed class MarkOverdueInvoicesJob
{
    private readonly IOverdueInvoiceMarker _overdueInvoiceMarker;
    private readonly ILogger<MarkOverdueInvoicesJob> _logger;

    public MarkOverdueInvoicesJob(
        IOverdueInvoiceMarker overdueInvoiceMarker,
        ILogger<MarkOverdueInvoicesJob> logger)
    {
        _overdueInvoiceMarker = overdueInvoiceMarker;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken cancellationToken)
    {
        DateOnly asOfDate = DateOnly.FromDateTime(DateTime.UtcNow);
        int markedCount = await _overdueInvoiceMarker.MarkOverdueInvoicesAsync(asOfDate, cancellationToken);

        _logger.LogInformation(
            "MarkOverdueInvoicesJob marked {Count} invoices as overdue as of {AsOfDate}.",
            markedCount,
            asOfDate);
    }
}
