using System.Globalization;
using Shared;

namespace Domain;

public sealed class InvoicePaymentSubmission : AggregateRoot<Guid>
{
    public Guid InvoiceId { get; private set; }

    public Guid ClientId { get; private set; }

    public decimal Amount { get; private set; }

    public string Currency { get; private set; } = string.Empty;

    public string Method { get; private set; } = string.Empty;

    public string Reference { get; private set; } = string.Empty;

    public Guid ProofDocumentId { get; private set; }

    public InvoicePaymentSubmissionStatus Status { get; private set; } = InvoicePaymentSubmissionStatus.Submitted;

    public Guid SubmittedByUserId { get; private set; }

    public Guid? ReviewedByUserId { get; private set; }

    public string? ReviewNotes { get; private set; }

    public DateTime? ReviewedAt { get; private set; }

    public string? GatewayProvider { get; private set; }

    public string? GatewayReference { get; private set; }

    private InvoicePaymentSubmission()
    {
    }

    private InvoicePaymentSubmission(
        Guid id,
        Guid invoiceId,
        Guid clientId,
        decimal amount,
        string currency,
        string method,
        string reference,
        Guid proofDocumentId,
        Guid submittedByUserId,
        string? gatewayProvider,
        string? gatewayReference)
        : base(id)
    {
        InvoiceId = NormalizeRequiredId(invoiceId, nameof(invoiceId));
        ClientId = NormalizeRequiredId(clientId, nameof(clientId));
        Amount = NormalizeAmount(amount);
        Currency = NormalizeCurrency(currency);
        Method = NormalizeRequiredText(method, nameof(method));
        Reference = NormalizeRequiredText(reference, nameof(reference));
        ProofDocumentId = NormalizeRequiredId(proofDocumentId, nameof(proofDocumentId));
        SubmittedByUserId = NormalizeRequiredId(submittedByUserId, nameof(submittedByUserId));
        GatewayProvider = NormalizeOptionalText(gatewayProvider);
        GatewayReference = NormalizeOptionalText(gatewayReference);
        Status = InvoicePaymentSubmissionStatus.Submitted;

        AddDomainEvent(new InvoicePaymentSubmissionCreatedEvent(Id, InvoiceId, ClientId, DateTime.UtcNow));
    }

    public static InvoicePaymentSubmission Create(
        Guid id,
        Guid invoiceId,
        Guid clientId,
        decimal amount,
        string currency,
        string method,
        string reference,
        Guid proofDocumentId,
        Guid submittedByUserId,
        string? gatewayProvider = null,
        string? gatewayReference = null)
    {
        return new InvoicePaymentSubmission(
            id,
            invoiceId,
            clientId,
            amount,
            currency,
            method,
            reference,
            proofDocumentId,
            submittedByUserId,
            gatewayProvider,
            gatewayReference);
    }

    public void Approve(Guid reviewedByUserId, DateTime reviewedAtUtc)
    {
        if (Status != InvoicePaymentSubmissionStatus.Submitted)
        {
            throw new InvalidOperationException("Only submitted payment submissions can be approved.");
        }

        Status = InvoicePaymentSubmissionStatus.Approved;
        ReviewedByUserId = NormalizeRequiredId(reviewedByUserId, nameof(reviewedByUserId));
        ReviewedAt = NormalizeUtc(reviewedAtUtc, nameof(reviewedAtUtc), allowFuture: false);
        AddDomainEvent(new InvoicePaymentSubmissionApprovedEvent(Id, InvoiceId, ClientId, ReviewedAt.Value));
        MarkUpdated();
    }

    public void Reject(Guid reviewedByUserId, DateTime reviewedAtUtc, string? reviewNotes)
    {
        if (Status != InvoicePaymentSubmissionStatus.Submitted)
        {
            throw new InvalidOperationException("Only submitted payment submissions can be rejected.");
        }

        Status = InvoicePaymentSubmissionStatus.Rejected;
        ReviewedByUserId = NormalizeRequiredId(reviewedByUserId, nameof(reviewedByUserId));
        ReviewedAt = NormalizeUtc(reviewedAtUtc, nameof(reviewedAtUtc), allowFuture: false);
        ReviewNotes = NormalizeOptionalText(reviewNotes);
        MarkUpdated();
    }

    private static Guid NormalizeRequiredId(Guid value, string paramName)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException("Identifier cannot be empty.", paramName);
        }

        return value;
    }

    private static decimal NormalizeAmount(decimal amount)
    {
        if (amount <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than zero.");
        }

        return decimal.Round(amount, 2, MidpointRounding.ToEven);
    }

    private static string NormalizeCurrency(string currency)
    {
        string normalizedCurrency = Guard.NotEmpty(currency, nameof(currency)).Trim().ToUpper(CultureInfo.InvariantCulture);
        if (normalizedCurrency.Length != 3 || normalizedCurrency.Any(ch => !char.IsAsciiLetter(ch)))
        {
            throw new ArgumentException("Currency must be a 3-letter ISO code.", nameof(currency));
        }

        return normalizedCurrency;
    }

    private static string NormalizeRequiredText(string value, string paramName)
    {
        return Guard.NotEmpty(value, paramName).Trim();
    }

    private static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static DateTime NormalizeUtc(DateTime value, string paramName, bool allowFuture)
    {
        DateTime normalized = value;
        if (normalized.Kind == DateTimeKind.Local)
        {
            normalized = normalized.ToUniversalTime();
        }
        else if (normalized.Kind == DateTimeKind.Unspecified)
        {
            normalized = DateTime.SpecifyKind(normalized, DateTimeKind.Utc);
        }

        if (!allowFuture && normalized > DateTime.UtcNow)
        {
            throw new ArgumentException("Timestamp cannot be in the future.", paramName);
        }

        return normalized;
    }
}
