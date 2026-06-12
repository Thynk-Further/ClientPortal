using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class InitiateClientPortalInvoicePaymentCommandHandler
    : IRequestHandler<InitiateClientPortalInvoicePaymentCommand, Result<ClientPortalInvoicePaymentSessionDto>>
{
    private static readonly Error InvoiceNotFoundError = new(
        "Invoices.NotFound",
        "Invoice was not found.",
        ErrorType.NotFound);

    private static readonly Error InvoiceNotPayableError = new(
        "Invoices.NotPayable",
        "This invoice cannot be paid online.",
        ErrorType.Conflict);

    private static readonly Error PaymentInitiationFailedError = new(
        "Invoices.PaymentInitiationFailed",
        "Online payment could not be started.",
        ErrorType.Conflict);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IPaymentGateway _paymentGateway;
    private readonly ClientPortalPaymentOptions _paymentOptions;

    public InitiateClientPortalInvoicePaymentCommandHandler(
        ICurrentClientResolver currentClientResolver,
        IInvoiceRepository invoiceRepository,
        IPaymentGateway paymentGateway,
        ClientPortalPaymentOptions paymentOptions)
    {
        _currentClientResolver = currentClientResolver;
        _invoiceRepository = invoiceRepository;
        _paymentGateway = paymentGateway;
        _paymentOptions = paymentOptions;
    }

    public async Task<Result<ClientPortalInvoicePaymentSessionDto>> Handle(
        InitiateClientPortalInvoicePaymentCommand request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalInvoicePaymentSessionDto>.Failure(clientIdResult.Errors);
        }

        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != clientIdResult.Value)
        {
            return Result<ClientPortalInvoicePaymentSessionDto>.Failure(InvoiceNotFoundError);
        }

        if (!IsPayable(invoice))
        {
            return Result<ClientPortalInvoicePaymentSessionDto>.Failure(InvoiceNotPayableError);
        }

        decimal outstandingAmount = GetOutstandingAmount(invoice);
        string provider = string.IsNullOrWhiteSpace(request.Provider)
            ? _paymentOptions.DefaultProvider
            : request.Provider.Trim();

        string reference = BuildPaymentReference(invoice.Id);
        PaymentGatewayChargeRequest chargeRequest = new(
            Provider: provider,
            InvoiceId: invoice.Id,
            Amount: outstandingAmount,
            Currency: invoice.Currency,
            Reference: reference,
            CallbackUrl: request.CallbackUrl.Trim());

        PaymentGatewayChargeResult chargeResult = await _paymentGateway.ChargeAsync(chargeRequest, cancellationToken);
        if (!chargeResult.IsSuccessful)
        {
            string message = string.IsNullOrWhiteSpace(chargeResult.FailureReason)
                ? PaymentInitiationFailedError.Message
                : chargeResult.FailureReason;

            return Result<ClientPortalInvoicePaymentSessionDto>.Failure(new Error(
                PaymentInitiationFailedError.Code,
                message,
                PaymentInitiationFailedError.Type));
        }

        ClientPortalInvoicePaymentSessionDto session = new(
            Provider: chargeResult.Provider,
            TransactionId: chargeResult.TransactionId,
            Reference: chargeResult.Reference,
            Status: chargeResult.Status,
            Amount: outstandingAmount,
            Currency: invoice.Currency,
            RedirectUrl: chargeResult.RedirectUrl);

        return Result<ClientPortalInvoicePaymentSessionDto>.Success(session);
    }

    private static bool IsPayable(Invoice invoice)
    {
        if (invoice.Status is InvoiceStatus.Draft or InvoiceStatus.Paid or InvoiceStatus.Cancelled)
        {
            return false;
        }

        return GetOutstandingAmount(invoice) > 0m;
    }

    private static decimal GetOutstandingAmount(Invoice invoice)
    {
        return decimal.Round(
            Math.Max(0m, invoice.Total - invoice.AmountPaid),
            2,
            MidpointRounding.ToEven);
    }

    private static string BuildPaymentReference(Guid invoiceId)
    {
        return $"inv-{invoiceId:N}-{Guid.CreateVersion7():N}";
    }
}
