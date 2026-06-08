using System.Globalization;
using Shared;

namespace Domain;

public sealed class Quote : AggregateRoot<Guid>
{
    private List<LineItem> _lineItems = [];

    public Guid ClientId { get; private set; }

    public Guid ProjectId { get; private set; }

    public string QuoteNumber { get; private set; } = string.Empty;

    public QuoteStatus Status { get; private set; } = QuoteStatus.Draft;

    public IReadOnlyList<LineItem> LineItems => _lineItems.AsReadOnly();

    public decimal Subtotal { get; private set; }

    public decimal TaxAmount { get; private set; }

    public decimal Total { get; private set; }

    public string Currency { get; private set; } = string.Empty;

    public DateOnly DueDate { get; private set; }

    public string? Notes { get; private set; }

    public Guid? ConvertedInvoiceId { get; private set; }

    private Quote()
    {
    }

    private Quote(
        Guid id,
        Guid clientId,
        Guid projectId,
        string quoteNumber,
        QuoteStatus status,
        IEnumerable<LineItem> lineItems,
        string currency,
        DateOnly dueDate,
        string? notes)
        : base(id)
    {
        ClientId = NormalizeRequiredId(clientId, nameof(clientId));
        ProjectId = NormalizeRequiredId(projectId, nameof(projectId));
        QuoteNumber = NormalizeRequiredText(quoteNumber, nameof(quoteNumber));
        Status = status;
        Currency = NormalizeCurrency(currency);
        DueDate = dueDate;
        Notes = NormalizeOptionalText(notes);
        ConvertedInvoiceId = null;

        ReplaceLineItemsInternal(lineItems);
    }

    public static Quote Create(
        Guid id,
        Guid clientId,
        Guid projectId,
        string quoteNumber,
        IEnumerable<LineItem> lineItems,
        string currency,
        DateOnly dueDate,
        string? notes = null)
    {
        return new Quote(id, clientId, projectId, quoteNumber, QuoteStatus.Draft, lineItems, currency, dueDate, notes);
    }

    public void ReplaceLineItems(IEnumerable<LineItem> lineItems)
    {
        EnsureEditable();
        ReplaceLineItemsInternal(lineItems);
        MarkUpdated();
    }

    public void UpdateNotes(string? notes)
    {
        Notes = NormalizeOptionalText(notes);
        MarkUpdated();
    }

    public void UpdateQuoteNumber(string quoteNumber)
    {
        EnsureEditable();
        QuoteNumber = NormalizeRequiredText(quoteNumber, nameof(quoteNumber));
        MarkUpdated();
    }

    public void UpdateCurrency(string currency)
    {
        EnsureEditable();
        Currency = NormalizeCurrency(currency);
        MarkUpdated();
    }

    public void SetDueDate(DateOnly dueDate)
    {
        EnsureEditable();
        DueDate = dueDate;
        MarkUpdated();
    }

    public void MarkSent()
    {
        if (Status != QuoteStatus.Draft)
        {
            throw new InvalidOperationException("Only draft quotes can be sent.");
        }

        Status = QuoteStatus.Sent;
        MarkUpdated();
    }

    public void MarkAccepted()
    {
        if (Status != QuoteStatus.Sent)
        {
            throw new InvalidOperationException("Only sent quotes can be accepted.");
        }

        Status = QuoteStatus.Accepted;
        AddDomainEvent(new QuoteAcceptedEvent(Id, ClientId, DateTime.UtcNow));
        MarkUpdated();
    }

    public void MarkConvertedToInvoice(Guid invoiceId)
    {
        if (Status != QuoteStatus.Accepted)
        {
            throw new InvalidOperationException("Only accepted quotes can be converted to invoices.");
        }

        if (ConvertedInvoiceId.HasValue)
        {
            throw new InvalidOperationException("Quote has already been converted to an invoice.");
        }

        if (invoiceId == Guid.Empty)
        {
            throw new ArgumentException("Invoice identifier cannot be empty.", nameof(invoiceId));
        }

        ConvertedInvoiceId = invoiceId;
        MarkUpdated();
    }

    public void MarkRejected()
    {
        if (Status is QuoteStatus.Accepted or QuoteStatus.Expired)
        {
            throw new InvalidOperationException("Accepted or expired quotes cannot be rejected.");
        }

        Status = QuoteStatus.Rejected;
        MarkUpdated();
    }

    public void MarkExpired()
    {
        if (Status is QuoteStatus.Accepted or QuoteStatus.Rejected)
        {
            throw new InvalidOperationException("Accepted or rejected quotes cannot be expired.");
        }

        Status = QuoteStatus.Expired;
        MarkUpdated();
    }

    private void EnsureEditable()
    {
        if (Status != QuoteStatus.Draft)
        {
            throw new InvalidOperationException("Only draft quotes can be modified.");
        }
    }

    private void ReplaceLineItemsInternal(IEnumerable<LineItem> lineItems)
    {
        Guard.NotNull(lineItems, nameof(lineItems));
        _lineItems.Clear();

        foreach (LineItem lineItem in lineItems)
        {
            _lineItems.Add(Guard.NotNull(lineItem, nameof(lineItems)));
        }

        if (_lineItems.Count == 0)
        {
            throw new ArgumentException("Quote must have at least one line item.", nameof(lineItems));
        }

        RecalculateTotals();
    }

    private void RecalculateTotals()
    {
        decimal subtotal = 0m;
        decimal taxAmount = 0m;

        foreach (LineItem lineItem in _lineItems)
        {
            subtotal += lineItem.Amount;
            taxAmount += lineItem.Amount * lineItem.TaxRate;
        }

        Subtotal = decimal.Round(subtotal, 2, MidpointRounding.ToEven);
        TaxAmount = decimal.Round(taxAmount, 2, MidpointRounding.ToEven);
        Total = decimal.Round(Subtotal + TaxAmount, 2, MidpointRounding.ToEven);
    }

    private static Guid NormalizeRequiredId(Guid value, string paramName)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException("Identifier cannot be empty.", paramName);
        }

        return value;
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

    private static string NormalizeCurrency(string currency)
    {
        string normalizedCurrency = Guard.NotEmpty(currency, nameof(currency)).Trim().ToUpper(CultureInfo.InvariantCulture);
        if (normalizedCurrency.Length != 3 || normalizedCurrency.Any(ch => !char.IsAsciiLetter(ch)))
        {
            throw new ArgumentException("Currency must be a 3-letter ISO code.", nameof(currency));
        }

        return normalizedCurrency;
    }
}
