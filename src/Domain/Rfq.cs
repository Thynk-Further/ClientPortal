using System.Globalization;
using Shared;

namespace Domain;

public sealed class Rfq : AggregateRoot<Guid>
{
    private List<RfqLineItem> _lineItems = [];

    public Guid ClientId { get; private set; }

    public Guid ProjectId { get; private set; }

    public string RfqNumber { get; private set; } = string.Empty;

    public RfqStatus Status { get; private set; } = RfqStatus.Draft;

    public string Currency { get; private set; } = string.Empty;

    public string? Notes { get; private set; }

    public Guid? QuotationId { get; private set; }

    public IReadOnlyList<RfqLineItem> LineItems => _lineItems.AsReadOnly();

    private Rfq()
    {
    }

    private Rfq(
        Guid id,
        Guid clientId,
        Guid projectId,
        string rfqNumber,
        RfqStatus status,
        IEnumerable<RfqLineItem> lineItems,
        string currency,
        string? notes)
        : base(id)
    {
        ClientId = NormalizeRequiredId(clientId, nameof(clientId));
        ProjectId = NormalizeRequiredId(projectId, nameof(projectId));
        RfqNumber = NormalizeRequiredText(rfqNumber, nameof(rfqNumber));
        Status = status;
        Currency = NormalizeCurrency(currency);
        Notes = NormalizeOptionalText(notes);
        QuotationId = null;

        ReplaceLineItemsInternal(lineItems);
    }

    public static Rfq Create(
        Guid id,
        Guid clientId,
        Guid projectId,
        string rfqNumber,
        IEnumerable<RfqLineItem> lineItems,
        string currency,
        string? notes = null)
    {
        return new Rfq(id, clientId, projectId, rfqNumber, RfqStatus.Draft, lineItems, currency, notes);
    }

    public void ReplaceLineItems(IEnumerable<RfqLineItem> lineItems)
    {
        EnsureEditable();
        ReplaceLineItemsInternal(lineItems);
        MarkUpdated();
    }

    public void UpdateNotes(string? notes)
    {
        EnsureEditable();
        Notes = NormalizeOptionalText(notes);
        MarkUpdated();
    }

    public void UpdateRfqNumber(string rfqNumber)
    {
        EnsureEditable();
        RfqNumber = NormalizeRequiredText(rfqNumber, nameof(rfqNumber));
        MarkUpdated();
    }

    public void UpdateCurrency(string currency)
    {
        EnsureEditable();
        Currency = NormalizeCurrency(currency);
        MarkUpdated();
    }

    public void Submit()
    {
        if (Status != RfqStatus.Draft)
        {
            throw new InvalidOperationException("Only draft RFQs can be submitted.");
        }

        Status = RfqStatus.Submitted;
        AddDomainEvent(new RfqSubmittedEvent(Id, ClientId, DateTime.UtcNow));
        MarkUpdated();
    }

    public void MarkQuoted(Guid quotationId)
    {
        if (Status != RfqStatus.Submitted)
        {
            throw new InvalidOperationException("Only submitted RFQs can be marked as quoted.");
        }

        if (quotationId == Guid.Empty)
        {
            throw new ArgumentException("Quotation identifier cannot be empty.", nameof(quotationId));
        }

        Status = RfqStatus.Quoted;
        QuotationId = quotationId;
        MarkUpdated();
    }

    public void MarkAccepted()
    {
        if (Status != RfqStatus.Quoted)
        {
            throw new InvalidOperationException("Only quoted RFQs can be accepted.");
        }

        Status = RfqStatus.Accepted;
        MarkUpdated();
    }

    public void MarkRejected()
    {
        if (Status is RfqStatus.Accepted or RfqStatus.Cancelled)
        {
            throw new InvalidOperationException("Accepted or cancelled RFQs cannot be rejected.");
        }

        Status = RfqStatus.Rejected;
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status is RfqStatus.Accepted)
        {
            throw new InvalidOperationException("Accepted RFQs cannot be cancelled.");
        }

        Status = RfqStatus.Cancelled;
        MarkUpdated();
    }

    private void EnsureEditable()
    {
        if (Status != RfqStatus.Draft)
        {
            throw new InvalidOperationException("Only draft RFQs can be modified.");
        }
    }

    private void ReplaceLineItemsInternal(IEnumerable<RfqLineItem> lineItems)
    {
        Guard.NotNull(lineItems, nameof(lineItems));
        _lineItems.Clear();

        foreach (RfqLineItem lineItem in lineItems)
        {
            _lineItems.Add(Guard.NotNull(lineItem, nameof(lineItems)));
        }

        if (_lineItems.Count == 0)
        {
            throw new ArgumentException("RFQ must have at least one line item.", nameof(lineItems));
        }
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
