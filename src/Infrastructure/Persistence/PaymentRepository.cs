using Application.Invoices.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class PaymentRepository : IPaymentRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public PaymentRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<bool> ExistsByReferenceAsync(Guid invoiceId, string reference, CancellationToken cancellationToken)
    {
        return _tenantDbContext.Set<Payment>()
            .AsNoTracking()
            .AnyAsync(
                payment => payment.InvoiceId == invoiceId && payment.Reference == reference,
                cancellationToken);
    }

    public void Add(Payment payment)
    {
        _tenantDbContext.Set<Payment>().Add(payment);
    }
}
