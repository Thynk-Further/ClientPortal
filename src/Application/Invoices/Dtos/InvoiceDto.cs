using Domain;

namespace Application.Invoices.Dtos;

public sealed record InvoiceDto(
    Guid Id,
    Guid ClientId,
    Guid ProjectId,
    string InvoiceNumber,
    InvoiceStatus Status,
    IReadOnlyCollection<InvoiceLineItemDto> LineItems,
    decimal Subtotal,
    decimal TaxAmount,
    decimal Total,
    decimal AmountPaid,
    string Currency,
    DateOnly DueDate,
    DateTime? PaidAt,
    string? Notes,
    Guid? PurchaseOrderId,
    Guid? QuotationId,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record InvoiceLineItemDto(
    string Description,
    decimal Quantity,
    decimal UnitPrice,
    decimal TaxRate,
    decimal Amount);
