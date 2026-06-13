using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetInvoicePaymentSubmissionsQueryHandler
    : IRequestHandler<GetInvoicePaymentSubmissionsQuery, Result<IReadOnlyList<InvoicePaymentSubmissionDto>>>
{
    private static readonly Error InvoiceNotFoundError = new("Invoices.NotFound", "Invoice was not found.", ErrorType.NotFound);

    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IInvoicePaymentSubmissionRepository _submissionRepository;

    public GetInvoicePaymentSubmissionsQueryHandler(
        IInvoiceRepository invoiceRepository,
        IInvoicePaymentSubmissionRepository submissionRepository)
    {
        _invoiceRepository = invoiceRepository;
        _submissionRepository = submissionRepository;
    }

    public async Task<Result<IReadOnlyList<InvoicePaymentSubmissionDto>>> Handle(
        GetInvoicePaymentSubmissionsQuery request,
        CancellationToken cancellationToken)
    {
        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != request.ClientId)
        {
            return Result<IReadOnlyList<InvoicePaymentSubmissionDto>>.Failure(InvoiceNotFoundError);
        }

        IReadOnlyList<InvoicePaymentSubmissionDto> submissions = await _submissionRepository.GetByInvoiceIdAsync(
            request.InvoiceId,
            cancellationToken);

        return Result<IReadOnlyList<InvoicePaymentSubmissionDto>>.Success(submissions);
    }
}
