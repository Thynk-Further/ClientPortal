using Application.Finance.Dtos;
using Domain;

namespace Application.Finance.Abstractions;

public interface IInvoicePaymentSubmissionRepository
{
    Task<IReadOnlyList<InvoicePaymentSubmissionDto>> GetByInvoiceIdAsync(
        Guid invoiceId,
        CancellationToken cancellationToken);

    Task<InvoicePaymentSubmission?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<bool> HasPendingSubmissionAsync(Guid invoiceId, CancellationToken cancellationToken);

    void Add(InvoicePaymentSubmission submission);

    void Update(InvoicePaymentSubmission submission);
}
