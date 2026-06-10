using Application.Invoices.Dtos;
using Domain;

namespace Application.Clients.Dtos;

public sealed record ClientPortalInvoiceListItemDto(
    Guid Id,
    Guid ProjectId,
    string InvoiceNumber,
    InvoiceStatus Status,
    decimal Total,
    decimal AmountPaid,
    decimal OutstandingAmount,
    string Currency,
    DateOnly DueDate,
    DateTime CreatedAt);

public sealed record ClientPortalInvoicesResultDto(
    IReadOnlyList<ClientPortalInvoiceListItemDto> Invoices);

public sealed record ClientPortalInvoiceDetailDto(
    Guid Id,
    Guid ProjectId,
    string InvoiceNumber,
    InvoiceStatus Status,
    IReadOnlyCollection<InvoiceLineItemDto> LineItems,
    decimal Subtotal,
    decimal TaxAmount,
    decimal Total,
    decimal AmountPaid,
    decimal OutstandingAmount,
    string Currency,
    DateOnly DueDate,
    DateTime? PaidAt,
    string? Notes,
    DateTime CreatedAt);

public sealed record ClientPortalInvoicePaymentSessionDto(
    string Provider,
    string TransactionId,
    string Reference,
    string Status,
    decimal Amount,
    string Currency,
    string? RedirectUrl);

public sealed record ClientPortalInvoicePaymentVerificationDto(
    Guid InvoiceId,
    InvoiceStatus Status,
    decimal AmountPaid,
    decimal OutstandingAmount);
