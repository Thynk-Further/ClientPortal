using Application.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;

namespace Infrastructure.Invoices;

public sealed class OverdueInvoiceMarker : IOverdueInvoiceMarker
{
    private readonly TenantDbContext _tenantDbContext;
    private readonly IUnitOfWork _unitOfWork;

    public OverdueInvoiceMarker(TenantDbContext tenantDbContext, IUnitOfWork unitOfWork)
    {
        _tenantDbContext = tenantDbContext;
        _unitOfWork = unitOfWork;
    }

    public async Task<int> MarkOverdueInvoicesAsync(DateOnly asOfDate, CancellationToken cancellationToken)
    {
        List<Invoice> invoices = await _tenantDbContext.Set<Invoice>()
            .Where(invoice =>
                invoice.DueDate < asOfDate
                && (invoice.Status == InvoiceStatus.Sent
                    || invoice.Status == InvoiceStatus.Viewed
                    || invoice.Status == InvoiceStatus.PartiallyPaid))
            .ToListAsync(cancellationToken);

        int markedCount = 0;

        foreach (Invoice invoice in invoices)
        {
            try
            {
                invoice.MarkOverdue(asOfDate);
                _tenantDbContext.Set<Invoice>().Update(invoice);
                markedCount++;
            }
            catch (InvalidOperationException)
            {
                // Skip invoices that transitioned concurrently.
            }
        }

        if (markedCount > 0)
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return markedCount;
    }
}
