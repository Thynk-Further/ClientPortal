using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class VerifyClientPortalInvoicePaymentCommandHandler
    : IRequestHandler<VerifyClientPortalInvoicePaymentCommand, Result<ClientPortalInvoicePaymentVerificationDto>>
{
    private static readonly Error InvoiceNotFoundError = new(
        "Invoices.NotFound",
        "Invoice was not found.",
        ErrorType.NotFound);

    private static readonly Error PaymentVerificationFailedError = new(
        "Invoices.PaymentVerificationFailed",
        "Payment verification failed.",
        ErrorType.Conflict);

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

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IPaymentGateway _paymentGateway;
    private readonly IUnitOfWork _unitOfWork;

    public VerifyClientPortalInvoicePaymentCommandHandler(
        ICurrentClientResolver currentClientResolver,
        IInvoiceRepository invoiceRepository,
        IPaymentRepository paymentRepository,
        IPaymentGateway paymentGateway,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _invoiceRepository = invoiceRepository;
        _paymentRepository = paymentRepository;
        _paymentGateway = paymentGateway;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ClientPortalInvoicePaymentVerificationDto>> Handle(
        VerifyClientPortalInvoicePaymentCommand request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalInvoicePaymentVerificationDto>.Failure(clientIdResult.Errors);
        }

        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != clientIdResult.Value)
        {
            return Result<ClientPortalInvoicePaymentVerificationDto>.Failure(InvoiceNotFoundError);
        }

        PaymentGatewayVerificationRequest verificationRequest = new(
            Provider: request.Provider.Trim(),
            TransactionId: request.TransactionId.Trim(),
            Reference: request.Reference.Trim());

        PaymentGatewayVerificationResult verification = await _paymentGateway.VerifyAsync(
            verificationRequest,
            cancellationToken);

        if (!verification.IsSuccessful)
        {
            string message = string.IsNullOrWhiteSpace(verification.FailureReason)
                ? PaymentVerificationFailedError.Message
                : verification.FailureReason;

            return Result<ClientPortalInvoicePaymentVerificationDto>.Failure(new Error(
                PaymentVerificationFailedError.Code,
                message,
                PaymentVerificationFailedError.Type));
        }

        bool exists = await _paymentRepository.ExistsByReferenceAsync(
            invoice.Id,
            verification.Reference,
            cancellationToken);

        if (exists)
        {
            return Result<ClientPortalInvoicePaymentVerificationDto>.Success(MapVerification(invoice));
        }

        decimal paymentAmount = verification.Amount ?? GetOutstandingAmount(invoice);
        if (paymentAmount <= 0m)
        {
            return Result<ClientPortalInvoicePaymentVerificationDto>.Failure(InvalidPaymentError);
        }

        string normalizedCurrency = (verification.Currency ?? invoice.Currency).Trim().ToUpperInvariant();
        if (!string.Equals(invoice.Currency, normalizedCurrency, StringComparison.Ordinal))
        {
            return Result<ClientPortalInvoicePaymentVerificationDto>.Failure(CurrencyMismatchError);
        }

        DateTime paidAtUtc = verification.ProcessedAtUtc ?? DateTime.UtcNow;

        Payment payment;
        try
        {
            invoice.RecordPayment(paymentAmount, paidAtUtc);
            payment = Payment.Create(
                id: Guid.CreateVersion7(),
                invoiceId: invoice.Id,
                amount: paymentAmount,
                currency: normalizedCurrency,
                method: verification.Provider,
                reference: verification.Reference,
                paidAtUtc: paidAtUtc);
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            return Result<ClientPortalInvoicePaymentVerificationDto>.Failure(InvalidPaymentError);
        }

        _paymentRepository.Add(payment);
        _invoiceRepository.Update(invoice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ClientPortalInvoicePaymentVerificationDto>.Success(MapVerification(invoice));
    }

    private static ClientPortalInvoicePaymentVerificationDto MapVerification(Invoice invoice)
    {
        return new ClientPortalInvoicePaymentVerificationDto(
            invoice.Id,
            invoice.Status,
            invoice.AmountPaid,
            GetOutstandingAmount(invoice));
    }

    private static decimal GetOutstandingAmount(Invoice invoice)
    {
        return decimal.Round(
            Math.Max(0m, invoice.Total - invoice.AmountPaid),
            2,
            MidpointRounding.ToEven);
    }
}
