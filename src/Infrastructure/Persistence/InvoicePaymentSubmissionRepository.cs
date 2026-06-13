using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class InvoicePaymentSubmissionRepository : IInvoicePaymentSubmissionRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public InvoicePaymentSubmissionRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<IReadOnlyList<InvoicePaymentSubmissionDto>> GetByInvoiceIdAsync(
        Guid invoiceId,
        CancellationToken cancellationToken)
    {
        return await _tenantDbContext.Set<InvoicePaymentSubmission>()
            .AsNoTracking()
            .Where(submission => submission.InvoiceId == invoiceId)
            .OrderByDescending(submission => submission.CreatedAt)
            .Select(submission => Map(submission))
            .ToListAsync(cancellationToken);
    }

    public Task<InvoicePaymentSubmission?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return _tenantDbContext.Set<InvoicePaymentSubmission>()
            .SingleOrDefaultAsync(submission => submission.Id == id, cancellationToken);
    }

    public Task<bool> HasPendingSubmissionAsync(Guid invoiceId, CancellationToken cancellationToken)
    {
        return _tenantDbContext.Set<InvoicePaymentSubmission>()
            .AsNoTracking()
            .AnyAsync(
                submission => submission.InvoiceId == invoiceId
                    && submission.Status == InvoicePaymentSubmissionStatus.Submitted,
                cancellationToken);
    }

    public void Add(InvoicePaymentSubmission submission)
    {
        _tenantDbContext.Set<InvoicePaymentSubmission>().Add(submission);
    }

    public void Update(InvoicePaymentSubmission submission)
    {
        _tenantDbContext.Set<InvoicePaymentSubmission>().Update(submission);
    }

    private static InvoicePaymentSubmissionDto Map(InvoicePaymentSubmission submission)
    {
        return new InvoicePaymentSubmissionDto(
            submission.Id,
            submission.InvoiceId,
            submission.ClientId,
            submission.Amount,
            submission.Currency,
            submission.Method,
            submission.Reference,
            submission.ProofDocumentId,
            submission.Status,
            submission.SubmittedByUserId,
            submission.ReviewedByUserId,
            submission.ReviewNotes,
            submission.ReviewedAt,
            submission.GatewayProvider,
            submission.GatewayReference,
            submission.CreatedAt,
            submission.UpdatedAt);
    }
}
