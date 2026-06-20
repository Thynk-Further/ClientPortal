using System.Globalization;
using Shared;

namespace Domain;

public sealed class Quote : AggregateRoot<Guid>
{
    private List<LineItem> _lineItems = [];

    public Guid? ClientId { get; private set; }

    public Guid? ProjectId { get; private set; }

    public string? RecipientCompanyName { get; private set; }

    public string? RecipientContactName { get; private set; }

    public string? RecipientEmail { get; private set; }

    public string? RecipientPhone { get; private set; }

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

    public Guid? RfqId { get; private set; }

    public Guid? PurchaseOrderId { get; private set; }

    public QuoteOrigin Origin { get; private set; } = QuoteOrigin.BusinessInitiated;

    public TaxPricingMode PricingMode { get; private set; } = TaxPricingMode.Exclusive;

    private Quote()
    {
    }

    private Quote(
        Guid id,
        Guid? clientId,
        Guid? projectId,
        string quoteNumber,
        QuoteStatus status,
        IEnumerable<LineItem> lineItems,
        string currency,
        DateOnly dueDate,
        string? notes,
        QuoteOrigin origin,
        Guid? rfqId,
        string? recipientCompanyName,
        string? recipientContactName,
        string? recipientEmail,
        string? recipientPhone,
        TaxPricingMode pricingMode = TaxPricingMode.Exclusive)
        : base(id)
    {
        ValidateClientProjectPair(clientId, projectId, origin);
        ValidateRecipientForOrigin(origin, recipientCompanyName);

        ClientId = NormalizeOptionalId(clientId);
        ProjectId = NormalizeOptionalId(projectId);
        RecipientCompanyName = NormalizeOptionalText(recipientCompanyName);
        RecipientContactName = NormalizeOptionalText(recipientContactName);
        RecipientEmail = NormalizeOptionalText(recipientEmail);
        RecipientPhone = NormalizeOptionalText(recipientPhone);
        QuoteNumber = NormalizeRequiredText(quoteNumber, nameof(quoteNumber));
        Status = status;
        Currency = NormalizeCurrency(currency);
        DueDate = dueDate;
        Notes = NormalizeOptionalText(notes);
        ConvertedInvoiceId = null;
        Origin = origin;
        RfqId = NormalizeOptionalId(rfqId);
        PurchaseOrderId = null;
        PricingMode = pricingMode;

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
        string? notes = null,
        TaxPricingMode pricingMode = TaxPricingMode.Exclusive)
    {
        return new Quote(
            id,
            clientId,
            projectId,
            quoteNumber,
            QuoteStatus.Draft,
            lineItems,
            currency,
            dueDate,
            notes,
            QuoteOrigin.BusinessInitiated,
            rfqId: null,
            recipientCompanyName: null,
            recipientContactName: null,
            recipientEmail: null,
            recipientPhone: null,
            pricingMode);
    }

    public static Quote CreateForExternalRecipient(
        Guid id,
        string quoteNumber,
        IEnumerable<LineItem> lineItems,
        string currency,
        DateOnly dueDate,
        string recipientCompanyName,
        string? recipientContactName = null,
        string? recipientEmail = null,
        string? recipientPhone = null,
        string? notes = null,
        TaxPricingMode pricingMode = TaxPricingMode.Exclusive)
    {
        return new Quote(
            id,
            clientId: null,
            projectId: null,
            quoteNumber,
            QuoteStatus.Draft,
            lineItems,
            currency,
            dueDate,
            notes,
            QuoteOrigin.ExternalOffPlatform,
            rfqId: null,
            recipientCompanyName,
            recipientContactName,
            recipientEmail,
            recipientPhone,
            pricingMode);
    }

    public static Quote CreateFromRfq(
        Guid id,
        Guid clientId,
        Guid projectId,
        Guid rfqId,
        string quoteNumber,
        IEnumerable<LineItem> lineItems,
        string currency,
        DateOnly dueDate,
        string? notes = null,
        TaxPricingMode pricingMode = TaxPricingMode.Exclusive)
    {
        if (rfqId == Guid.Empty)
        {
            throw new ArgumentException("RFQ identifier cannot be empty.", nameof(rfqId));
        }

        return new Quote(
            id,
            clientId,
            projectId,
            quoteNumber,
            QuoteStatus.Draft,
            lineItems,
            currency,
            dueDate,
            notes,
            QuoteOrigin.RfqResponse,
            rfqId,
            recipientCompanyName: null,
            recipientContactName: null,
            recipientEmail: null,
            recipientPhone: null,
            pricingMode);
    }

    public void LinkPurchaseOrder(Guid purchaseOrderId)
    {
        if (Origin != QuoteOrigin.RfqResponse)
        {
            throw new InvalidOperationException("Only RFQ response quotations can be linked to purchase orders.");
        }

        if (Status != QuoteStatus.Accepted)
        {
            throw new InvalidOperationException("Only accepted quotations can be linked to purchase orders.");
        }

        if (purchaseOrderId == Guid.Empty)
        {
            throw new ArgumentException("Purchase order identifier cannot be empty.", nameof(purchaseOrderId));
        }

        PurchaseOrderId = purchaseOrderId;
        MarkUpdated();
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

    public void UpdateExternalRecipient(
        string recipientCompanyName,
        string? recipientContactName,
        string? recipientEmail,
        string? recipientPhone)
    {
        if (Origin != QuoteOrigin.ExternalOffPlatform)
        {
            throw new InvalidOperationException("Only external quotations can update recipient details.");
        }

        EnsureEditable();
        RecipientCompanyName = NormalizeRequiredText(recipientCompanyName, nameof(recipientCompanyName));
        RecipientContactName = NormalizeOptionalText(recipientContactName);
        RecipientEmail = NormalizeOptionalText(recipientEmail);
        RecipientPhone = NormalizeOptionalText(recipientPhone);
        MarkUpdated();
    }

    public void MarkSent()
    {
        if (Status != QuoteStatus.Draft)
        {
            throw new InvalidOperationException("Only draft quotes can be sent.");
        }

        Status = QuoteStatus.Sent;
        AddDomainEvent(new QuotationSentEvent(Id, ClientId, DateTime.UtcNow));
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
        if (Origin == QuoteOrigin.RfqResponse)
        {
            throw new InvalidOperationException("RFQ response quotations must be invoiced through purchase order approval.");
        }

        if (!ClientId.HasValue || !ProjectId.HasValue)
        {
            throw new InvalidOperationException("External quotations must be assigned to a portal client before invoicing.");
        }

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
        decimal total = 0m;

        foreach (LineItem lineItem in _lineItems)
        {
            if (PricingMode == TaxPricingMode.Inclusive)
            {
                decimal grossAmount = lineItem.Amount;
                decimal lineTax = lineItem.TaxRate > 0m
                    ? grossAmount * lineItem.TaxRate / (1m + lineItem.TaxRate)
                    : 0m;
                decimal lineSubtotal = grossAmount - lineTax;
                subtotal += lineSubtotal;
                taxAmount += lineTax;
                total += grossAmount;
            }
            else
            {
                subtotal += lineItem.Amount;
                taxAmount += lineItem.Amount * lineItem.TaxRate;
            }
        }

        if (PricingMode == TaxPricingMode.Exclusive)
        {
            total = subtotal + taxAmount;
        }

        Subtotal = decimal.Round(subtotal, 2, MidpointRounding.ToEven);
        TaxAmount = decimal.Round(taxAmount, 2, MidpointRounding.ToEven);
        Total = decimal.Round(total, 2, MidpointRounding.ToEven);
    }

    private static void ValidateClientProjectPair(Guid? clientId, Guid? projectId, QuoteOrigin origin)
    {
        bool hasClient = clientId.HasValue && clientId.Value != Guid.Empty;
        bool hasProject = projectId.HasValue && projectId.Value != Guid.Empty;

        if (origin == QuoteOrigin.ExternalOffPlatform)
        {
            if (hasClient || hasProject)
            {
                throw new ArgumentException("External quotations cannot be linked to portal clients or projects.");
            }

            return;
        }

        if (!hasClient || !hasProject)
        {
            throw new ArgumentException("Portal quotations require both client and project identifiers.");
        }
    }

    private static void ValidateRecipientForOrigin(QuoteOrigin origin, string? recipientCompanyName)
    {
        if (origin != QuoteOrigin.ExternalOffPlatform)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(recipientCompanyName))
        {
            throw new ArgumentException("Recipient company name is required for external quotations.", nameof(recipientCompanyName));
        }
    }

    private static Guid? NormalizeOptionalId(Guid? value)
    {
        if (!value.HasValue || value.Value == Guid.Empty)
        {
            return null;
        }

        return value.Value;
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
