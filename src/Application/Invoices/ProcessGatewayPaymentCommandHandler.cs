using Application.Finance.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class ProcessGatewayPaymentCommandHandler : IRequestHandler<ProcessGatewayPaymentCommand, Result>
{
    private static readonly Error InvalidWebhookSignatureError = new(
        "Invoices.InvalidWebhookSignature",
        "Webhook signature verification failed.",
        ErrorType.Forbidden);

    private static readonly Error InvoiceNotFoundError = new(
        "Invoices.NotFound",
        "Invoice was not found.",
        ErrorType.NotFound);

    private static readonly Error CurrencyMismatchError = new(
        "Invoices.PaymentCurrencyMismatch",
        "Payment currency must match invoice currency.",
        ErrorType.Validation);

    private static readonly Error DuplicateGatewayPaymentError = new(
        "Invoices.DuplicateGatewayPayment",
        "Gateway payment reference has already been processed.",
        ErrorType.Conflict);

    private static readonly Error InvalidPaymentError = new(
        "Invoices.InvalidPayment",
        "Payment could not be applied to this invoice.",
        ErrorType.Conflict);

    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IInvoicePaymentSubmissionRepository _submissionRepository;
    private readonly IPaymentGatewayWebhookVerifier _paymentGatewayWebhookVerifier;

    public ProcessGatewayPaymentCommandHandler(
        IInvoiceRepository invoiceRepository,
        IInvoicePaymentSubmissionRepository submissionRepository,
        IPaymentGatewayWebhookVerifier paymentGatewayWebhookVerifier)
    {
        _invoiceRepository = invoiceRepository;
        _submissionRepository = submissionRepository;
        _paymentGatewayWebhookVerifier = paymentGatewayWebhookVerifier;
    }

    public async Task<Result> Handle(ProcessGatewayPaymentCommand request, CancellationToken cancellationToken)
    {
        PaymentGatewayWebhookVerificationResult verification = await _paymentGatewayWebhookVerifier.VerifyAsync(
            request.Provider,
            request.Payload,
            request.Signature,
            cancellationToken);

        if (!verification.IsValid)
        {
            return Result.Failure(InvalidWebhookSignatureError);
        }

        Invoice? invoice = await _invoiceRepository.FindByIdAsync(verification.InvoiceId, cancellationToken);
        if (invoice is null)
        {
            return Result.Failure(InvoiceNotFoundError);
        }

        string normalizedCurrency = verification.Currency.Trim().ToUpperInvariant();
        if (!string.Equals(invoice.Currency, normalizedCurrency, StringComparison.Ordinal))
        {
            return Result.Failure(CurrencyMismatchError);
        }

        IReadOnlyList<Application.Finance.Dtos.InvoicePaymentSubmissionDto> submissions =
            await _submissionRepository.GetByInvoiceIdAsync(invoice.Id, cancellationToken);

        Application.Finance.Dtos.InvoicePaymentSubmissionDto? matchingSubmission = submissions
            .FirstOrDefault(submission =>
                submission.Status == InvoicePaymentSubmissionStatus.Submitted
                && string.Equals(submission.Reference, verification.Reference, StringComparison.Ordinal));

        if (matchingSubmission is null)
        {
            return Result.Failure(new Error(
                "Finance.SubmissionRequired",
                "Gateway payment received but no matching payment submission with proof exists.",
                ErrorType.Conflict));
        }

        return Result.Success();
    }
}
