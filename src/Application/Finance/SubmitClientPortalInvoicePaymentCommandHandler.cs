using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Documents.Abstractions;
using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class SubmitClientPortalInvoicePaymentCommandHandler
    : IRequestHandler<SubmitClientPortalInvoicePaymentCommand, Result<InvoicePaymentSubmissionDto>>
{
    private static readonly Error InvoiceNotFoundError = new("Invoices.NotFound", "Invoice was not found.", ErrorType.NotFound);
    private static readonly Error InvoiceNotPayableError = new("Invoices.NotPayable", "This invoice cannot receive payments.", ErrorType.Conflict);
    private static readonly Error ProofDocumentNotFoundError = new("Finance.ProofNotFound", "Payment proof document was not found.", ErrorType.NotFound);
    private static readonly Error PendingSubmissionExistsError = new("Finance.PendingSubmissionExists", "A payment submission is already pending review.", ErrorType.Conflict);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly ICurrentUser _currentUser;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IDocumentRepository _documentRepository;
    private readonly IInvoicePaymentSubmissionRepository _submissionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public SubmitClientPortalInvoicePaymentCommandHandler(
        ICurrentClientResolver currentClientResolver,
        ICurrentUser currentUser,
        IInvoiceRepository invoiceRepository,
        IDocumentRepository documentRepository,
        IInvoicePaymentSubmissionRepository submissionRepository,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _currentUser = currentUser;
        _invoiceRepository = invoiceRepository;
        _documentRepository = documentRepository;
        _submissionRepository = submissionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<InvoicePaymentSubmissionDto>> Handle(
        SubmitClientPortalInvoicePaymentCommand request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<InvoicePaymentSubmissionDto>.Failure(clientIdResult.Errors);
        }

        if (!_currentUser.UserId.HasValue)
        {
            return Result<InvoicePaymentSubmissionDto>.Failure(new Error(
                "Auth.Unauthorized",
                "Authenticated user is required.",
                ErrorType.Forbidden));
        }

        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != clientIdResult.Value)
        {
            return Result<InvoicePaymentSubmissionDto>.Failure(InvoiceNotFoundError);
        }

        if (!IsPayable(invoice))
        {
            return Result<InvoicePaymentSubmissionDto>.Failure(InvoiceNotPayableError);
        }

        Document? proofDocument = await _documentRepository.FindByIdAsync(request.ProofDocumentId, cancellationToken);
        if (proofDocument is null || proofDocument.ClientId != clientIdResult.Value)
        {
            return Result<InvoicePaymentSubmissionDto>.Failure(ProofDocumentNotFoundError);
        }

        if (proofDocument.Status == DocumentStatus.Uploading)
        {
            proofDocument.MarkUploadConfirmed();
            _documentRepository.Update(proofDocument);
        }
        else if (proofDocument.Status != DocumentStatus.Active)
        {
            return Result<InvoicePaymentSubmissionDto>.Failure(ProofDocumentNotFoundError);
        }

        if (await _submissionRepository.HasPendingSubmissionAsync(invoice.Id, cancellationToken))
        {
            return Result<InvoicePaymentSubmissionDto>.Failure(PendingSubmissionExistsError);
        }

        string normalizedCurrency = request.Currency.Trim().ToUpperInvariant();
        if (!string.Equals(invoice.Currency, normalizedCurrency, StringComparison.Ordinal))
        {
            return Result<InvoicePaymentSubmissionDto>.Failure(new Error(
                "Invoices.PaymentCurrencyMismatch",
                "Payment currency must match invoice currency.",
                ErrorType.Validation));
        }

        InvoicePaymentSubmission submission = InvoicePaymentSubmission.Create(
            Guid.CreateVersion7(),
            invoice.Id,
            invoice.ClientId,
            request.Amount,
            normalizedCurrency,
            request.Method,
            request.Reference,
            request.ProofDocumentId,
            _currentUser.UserId.Value,
            request.GatewayProvider,
            request.GatewayReference);

        _submissionRepository.Add(submission);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        IReadOnlyList<InvoicePaymentSubmissionDto> submissions = await _submissionRepository.GetByInvoiceIdAsync(
            invoice.Id,
            cancellationToken);

        InvoicePaymentSubmissionDto created = submissions.First(submissionDto => submissionDto.Id == submission.Id);
        return Result<InvoicePaymentSubmissionDto>.Success(created);
    }

    private static bool IsPayable(Invoice invoice)
    {
        return invoice.Status is InvoiceStatus.Sent
            or InvoiceStatus.Viewed
            or InvoiceStatus.PartiallyPaid
            or InvoiceStatus.Overdue;
    }
}
