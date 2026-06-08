using System.Globalization;
using Shared;

namespace Domain;

public sealed class Invoice : AggregateRoot<Guid>
{
    private List<LineItem> _lineItems = [];

    public Guid ClientId { get; private set; }

    public Guid ProjectId { get; private set; }

    public string InvoiceNumber { get; private set; } = string.Empty;

    public InvoiceStatus Status { get; private set; } = InvoiceStatus.Draft;

    public IReadOnlyList<LineItem> LineItems => _lineItems.AsReadOnly();

    public decimal Subtotal { get; private set; }

    public decimal TaxAmount { get; private set; }

    public decimal Total { get; private set; }

    public decimal AmountPaid { get; private set; }

    public string Currency { get; private set; } = string.Empty;

    public DateOnly DueDate { get; private set; }

    public DateTime? PaidAt { get; private set; }

    public string? Notes { get; private set; }

    private Invoice()
    {
    }

    private Invoice(
        Guid id,
        Guid clientId,
        Guid projectId,
        string invoiceNumber,
        InvoiceStatus status,
        IEnumerable<LineItem> lineItems,
        string currency,
        DateOnly dueDate,
        DateTime? paidAtUtc,
        string? notes)
        : base(id)
    {
        ClientId = NormalizeRequiredId(clientId, nameof(clientId));
        ProjectId = NormalizeRequiredId(projectId, nameof(projectId));
        InvoiceNumber = NormalizeRequiredText(invoiceNumber, nameof(invoiceNumber));
        Status = status;
        Currency = NormalizeCurrency(currency);
        DueDate = dueDate;
        AmountPaid = 0m;
        PaidAt = NormalizeOptionalUtc(paidAtUtc, nameof(paidAtUtc), allowFuture: false);
        Notes = NormalizeOptionalText(notes);

        ReplaceLineItemsInternal(lineItems);
        EnsureStateConsistency();
    }

    public static Invoice Create(
        Guid id,
        Guid clientId,
        Guid projectId,
        string invoiceNumber,
        IEnumerable<LineItem> lineItems,
        string currency,
        DateOnly dueDate,
        string? notes = null)
    {
        return new Invoice(
            id,
            clientId,
            projectId,
            invoiceNumber,
            InvoiceStatus.Draft,
            lineItems,
            currency,
            dueDate,
            paidAtUtc: null,
            notes);
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

    public void UpdateInvoiceNumber(string invoiceNumber)
    {
        EnsureEditable();
        InvoiceNumber = NormalizeRequiredText(invoiceNumber, nameof(invoiceNumber));
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
        if (Status != InvoiceStatus.Draft)
        {
            throw new InvalidOperationException("Only draft invoices can be sent.");
        }

        Status = InvoiceStatus.Sent;
        AddDomainEvent(new InvoiceSentEvent(Id, ClientId, DateTime.UtcNow));
        MarkUpdated();
    }

    public void MarkViewed()
    {
        if (Status != InvoiceStatus.Sent)
        {
            throw new InvalidOperationException("Only sent invoices can be marked as viewed.");
        }

        Status = InvoiceStatus.Viewed;
        AddDomainEvent(new InvoiceViewedEvent(Id, ClientId, DateTime.UtcNow));
        MarkUpdated();
    }

    public void MarkPaid(DateTime paidAtUtc)
    {
        DateTime normalizedPaidAt = NormalizeOptionalUtc(paidAtUtc, nameof(paidAtUtc), allowFuture: false)!.Value;
        if (Status == InvoiceStatus.Cancelled)
        {
            throw new InvalidOperationException("Cancelled invoices cannot be paid.");
        }

        Status = InvoiceStatus.Paid;
        AmountPaid = Total;
        PaidAt = normalizedPaidAt;
        AddDomainEvent(new InvoicePaidEvent(Id, ClientId, normalizedPaidAt));
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status == InvoiceStatus.Paid)
        {
            throw new InvalidOperationException("Paid invoices cannot be cancelled.");
        }

        Status = InvoiceStatus.Cancelled;
        MarkUpdated();
    }

    public void RecordPayment(decimal amount, DateTime paidAtUtc)
    {
        decimal normalizedAmount = NormalizePaymentAmount(amount);
        DateTime normalizedPaidAt = NormalizeOptionalUtc(paidAtUtc, nameof(paidAtUtc), allowFuture: false)!.Value;
        if (Status == InvoiceStatus.Cancelled)
        {
            throw new InvalidOperationException("Cancelled invoices cannot receive payments.");
        }

        decimal remainingBeforePayment = decimal.Round(Total - AmountPaid, 2, MidpointRounding.ToEven);
        if (normalizedAmount > remainingBeforePayment)
        {
            throw new InvalidOperationException("Payment amount exceeds outstanding invoice balance.");
        }

        AmountPaid = decimal.Round(AmountPaid + normalizedAmount, 2, MidpointRounding.ToEven);
        if (AmountPaid >= Total)
        {
            Status = InvoiceStatus.Paid;
            PaidAt = normalizedPaidAt;
            AddDomainEvent(new InvoicePaidEvent(Id, ClientId, normalizedPaidAt));
        }
        else
        {
            Status = InvoiceStatus.PartiallyPaid;
            PaidAt = null;
        }

        MarkUpdated();
    }

    private void EnsureEditable()
    {
        if (Status != InvoiceStatus.Draft)
        {
            throw new InvalidOperationException("Only draft invoices can be modified.");
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
            throw new ArgumentException("Invoice must have at least one line item.", nameof(lineItems));
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

    private void EnsureStateConsistency()
    {
        if (Status == InvoiceStatus.Paid && !PaidAt.HasValue)
        {
            throw new InvalidOperationException("Paid invoices must include a paid timestamp.");
        }

        if (Status != InvoiceStatus.Paid && PaidAt.HasValue)
        {
            throw new InvalidOperationException("Only paid invoices can include a paid timestamp.");
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

    private static DateTime? NormalizeOptionalUtc(DateTime? timestamp, string paramName, bool allowFuture)
    {
        if (!timestamp.HasValue)
        {
            return null;
        }

        DateTime normalized = timestamp.Value;
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

    private static decimal NormalizePaymentAmount(decimal amount)
    {
        if (amount <= 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(amount), "Payment amount must be greater than zero.");
        }

        return decimal.Round(amount, 2, MidpointRounding.ToEven);
    }
}

public sealed record LineItem
{
    /// <summary>Parameterless constructor for EF Core owned entity materialization.</summary>
    private LineItem()
    {
        Description = string.Empty;
        Quantity = 1m;
        UnitPrice = 0m;
        TaxRate = 0m;
        Amount = 0m;
    }

    public LineItem(string description, decimal quantity, decimal unitPrice, decimal taxRate)
        : this()
    {
        Description = Guard.NotEmpty(description, nameof(description)).Trim();
        Quantity = NormalizeQuantity(quantity);
        UnitPrice = NormalizeUnitPrice(unitPrice);
        TaxRate = NormalizeTaxRate(taxRate);
        Amount = decimal.Round(Quantity * UnitPrice, 2, MidpointRounding.ToEven);
    }

    public string Description { get; init; } = string.Empty;

    public decimal Quantity { get; init; }

    public decimal UnitPrice { get; init; }

    public decimal TaxRate { get; init; }

    public decimal Amount { get; init; }

    private static decimal NormalizeQuantity(decimal quantity)
    {
        if (quantity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be greater than zero.");
        }

        return quantity;
    }

    private static decimal NormalizeUnitPrice(decimal unitPrice)
    {
        if (unitPrice < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(unitPrice), "Unit price cannot be negative.");
        }

        return decimal.Round(unitPrice, 2, MidpointRounding.ToEven);
    }

    private static decimal NormalizeTaxRate(decimal taxRate)
    {
        if (taxRate < 0 || taxRate > 1)
        {
            throw new ArgumentOutOfRangeException(nameof(taxRate), "Tax rate must be between 0 and 1.");
        }

        return decimal.Round(taxRate, 4, MidpointRounding.ToEven);
    }
}
