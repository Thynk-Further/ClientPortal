using System.Globalization;
using Shared;

namespace Domain;

public sealed class PurchaseOrder : AggregateRoot<Guid>
{
    private List<LineItem> _lineItems = [];

    public Guid ClientId { get; private set; }

    public Guid ProjectId { get; private set; }

    public string PoNumber { get; private set; } = string.Empty;

    public Guid QuotationId { get; private set; }

    public Guid RfqId { get; private set; }

    public PurchaseOrderStatus Status { get; private set; } = PurchaseOrderStatus.PendingApproval;

    public IReadOnlyList<LineItem> LineItems => _lineItems.AsReadOnly();

    public decimal Subtotal { get; private set; }

    public decimal TaxAmount { get; private set; }

    public decimal Total { get; private set; }

    public string Currency { get; private set; } = string.Empty;

    public DateTime? ApprovedAt { get; private set; }

    public Guid? GeneratedInvoiceId { get; private set; }

    public string? Notes { get; private set; }

    private PurchaseOrder()
    {
    }

    private PurchaseOrder(
        Guid id,
        Guid clientId,
        Guid projectId,
        string poNumber,
        Guid quotationId,
        Guid rfqId,
        IEnumerable<LineItem> lineItems,
        string currency,
        string? notes)
        : base(id)
    {
        ClientId = NormalizeRequiredId(clientId, nameof(clientId));
        ProjectId = NormalizeRequiredId(projectId, nameof(projectId));
        PoNumber = NormalizeRequiredText(poNumber, nameof(poNumber));
        QuotationId = NormalizeRequiredId(quotationId, nameof(quotationId));
        RfqId = NormalizeRequiredId(rfqId, nameof(rfqId));
        Currency = NormalizeCurrency(currency);
        Notes = NormalizeOptionalText(notes);
        Status = PurchaseOrderStatus.PendingApproval;
        ApprovedAt = null;
        GeneratedInvoiceId = null;

        ReplaceLineItemsInternal(lineItems);
    }

    public static PurchaseOrder CreateFromQuotation(
        Guid id,
        Guid clientId,
        Guid projectId,
        string poNumber,
        Guid quotationId,
        Guid rfqId,
        IEnumerable<LineItem> lineItems,
        string currency,
        string? notes = null)
    {
        return new PurchaseOrder(id, clientId, projectId, poNumber, quotationId, rfqId, lineItems, currency, notes);
    }

    public void Approve(DateTime approvedAtUtc)
    {
        if (Status != PurchaseOrderStatus.PendingApproval)
        {
            throw new InvalidOperationException("Only pending purchase orders can be approved.");
        }

        DateTime normalizedApprovedAt = NormalizeUtc(approvedAtUtc, nameof(approvedAtUtc), allowFuture: false);
        Status = PurchaseOrderStatus.Approved;
        ApprovedAt = normalizedApprovedAt;
        AddDomainEvent(new PurchaseOrderApprovedEvent(Id, ClientId, QuotationId, normalizedApprovedAt));
        MarkUpdated();
    }

    public void MarkInvoiced(Guid invoiceId)
    {
        if (Status != PurchaseOrderStatus.Approved)
        {
            throw new InvalidOperationException("Only approved purchase orders can be marked as invoiced.");
        }

        if (invoiceId == Guid.Empty)
        {
            throw new ArgumentException("Invoice identifier cannot be empty.", nameof(invoiceId));
        }

        Status = PurchaseOrderStatus.Invoiced;
        GeneratedInvoiceId = invoiceId;
        MarkUpdated();
    }

    public void Reject()
    {
        if (Status != PurchaseOrderStatus.PendingApproval)
        {
            throw new InvalidOperationException("Only pending purchase orders can be rejected.");
        }

        Status = PurchaseOrderStatus.Rejected;
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status is PurchaseOrderStatus.Invoiced)
        {
            throw new InvalidOperationException("Invoiced purchase orders cannot be cancelled.");
        }

        Status = PurchaseOrderStatus.Cancelled;
        MarkUpdated();
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
            throw new ArgumentException("Purchase order must have at least one line item.", nameof(lineItems));
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
