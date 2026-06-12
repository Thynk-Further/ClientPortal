using System.Globalization;
using Shared;

namespace Domain;

public sealed class Payment : Entity<Guid>
{
    public Guid InvoiceId { get; private set; }

    public decimal Amount { get; private set; }

    public string Currency { get; private set; } = string.Empty;

    public string Method { get; private set; } = string.Empty;

    public string Reference { get; private set; } = string.Empty;

    public DateTime PaidAt { get; private set; }

    public string? Notes { get; private set; }

    public Guid? SubmissionId { get; private set; }

    private Payment()
    {
    }

    private Payment(
        Guid id,
        Guid invoiceId,
        decimal amount,
        string currency,
        string method,
        string reference,
        DateTime paidAtUtc,
        string? notes,
        Guid? submissionId)
        : base(id)
    {
        InvoiceId = NormalizeRequiredId(invoiceId, nameof(invoiceId));
        Amount = NormalizeAmount(amount);
        Currency = NormalizeCurrency(currency);
        Method = NormalizeRequiredText(method, nameof(method));
        Reference = NormalizeRequiredText(reference, nameof(reference));
        PaidAt = NormalizeUtc(paidAtUtc, nameof(paidAtUtc), allowFuture: false);
        Notes = NormalizeOptionalText(notes);
        SubmissionId = NormalizeOptionalId(submissionId);
    }

    public static Payment Create(
        Guid id,
        Guid invoiceId,
        decimal amount,
        string currency,
        string method,
        string reference,
        DateTime paidAtUtc,
        string? notes = null,
        Guid? submissionId = null)
    {
        return new Payment(id, invoiceId, amount, currency, method, reference, paidAtUtc, notes, submissionId);
    }

    public void UpdateDetails(string method, string reference, string? notes)
    {
        Method = NormalizeRequiredText(method, nameof(method));
        Reference = NormalizeRequiredText(reference, nameof(reference));
        Notes = NormalizeOptionalText(notes);
        MarkUpdated();
    }

    private static Guid? NormalizeOptionalId(Guid? value)
    {
        if (!value.HasValue || value.Value == Guid.Empty)
        {
            return null;
        }

        return value.Value;
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
