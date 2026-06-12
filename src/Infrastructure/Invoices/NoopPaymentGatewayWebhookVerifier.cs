using Application.Invoices.Abstractions;

namespace Infrastructure.Invoices;

public sealed class NoopPaymentGatewayWebhookVerifier : IPaymentGatewayWebhookVerifier
{
    public Task<PaymentGatewayWebhookVerificationResult> VerifyAsync(
        string provider,
        string payload,
        string signature,
        CancellationToken cancellationToken)
    {
        _ = provider;
        _ = payload;
        _ = signature;
        _ = cancellationToken;

        return Task.FromResult(new PaymentGatewayWebhookVerificationResult(
            IsValid: false,
            InvoiceId: Guid.Empty,
            Amount: 0m,
            Currency: string.Empty,
            Reference: string.Empty,
            Method: string.Empty,
            PaidAtUtc: DateTime.UtcNow));
    }
}
