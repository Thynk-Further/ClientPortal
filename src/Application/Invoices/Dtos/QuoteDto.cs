using Domain;
using Shared;

namespace Application.Invoices.Dtos;

public sealed record QuoteDto(
    Guid Id,
    Guid? ClientId,
    Guid? ProjectId,
    string QuoteNumber,
    QuoteStatus Status,
    IReadOnlyCollection<InvoiceLineItemDto> LineItems,
    decimal Subtotal,
    decimal TaxAmount,
    decimal Total,
    string Currency,
    DateOnly DueDate,
    string? Notes,
    Guid? ConvertedInvoiceId,
    Guid? RfqId,
    string? RfqTitle,
    Guid? PurchaseOrderId,
    QuoteOrigin Origin,
    string? RecipientCompanyName,
    string? RecipientContactName,
    string? RecipientEmail,
    string? RecipientPhone,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record QuoteListItemDto(
    Guid Id,
    Guid? ClientId,
    Guid? ProjectId,
    string QuoteNumber,
    QuoteStatus Status,
    decimal Total,
    string Currency,
    DateOnly DueDate,
    Guid? ConvertedInvoiceId,
    Guid? RfqId,
    string? RfqTitle,
    QuoteOrigin Origin,
    string? RecipientCompanyName,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record GetQuotesResultDto(
    PagedResult<QuoteListItemDto> Quotes);
