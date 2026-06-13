using Application.Invoices.Dtos;
using Domain;
using Shared;

namespace Application.Finance.Dtos;

public sealed record RfqLineItemDto(string Description, decimal Quantity);

public sealed record RfqDto(
    Guid Id,
    Guid ClientId,
    string ClientCompanyName,
    Guid ProjectId,
    string RfqNumber,
    string Title,
    DateTime QuotationDueAtUtc,
    RfqStatus Status,
    IReadOnlyCollection<RfqLineItemDto> LineItems,
    string Currency,
    string? Notes,
    Guid? QuotationId,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record RfqListItemDto(
    Guid Id,
    Guid ClientId,
    string ClientCompanyName,
    Guid ProjectId,
    string RfqNumber,
    string Title,
    DateTime QuotationDueAtUtc,
    RfqStatus Status,
    string Currency,
    Guid? QuotationId,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record GetRfqsResultDto(PagedResult<RfqListItemDto> Rfqs);

public sealed record PurchaseOrderDto(
    Guid Id,
    Guid ClientId,
    Guid ProjectId,
    string PoNumber,
    Guid QuotationId,
    Guid RfqId,
    PurchaseOrderStatus Status,
    IReadOnlyCollection<InvoiceLineItemDto> LineItems,
    decimal Subtotal,
    decimal TaxAmount,
    decimal Total,
    string Currency,
    DateTime? ApprovedAt,
    Guid? GeneratedInvoiceId,
    string? Notes,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record PurchaseOrderListItemDto(
    Guid Id,
    Guid ClientId,
    Guid ProjectId,
    string PoNumber,
    Guid QuotationId,
    Guid RfqId,
    PurchaseOrderStatus Status,
    decimal Total,
    string Currency,
    Guid? GeneratedInvoiceId,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record GetPurchaseOrdersResultDto(PagedResult<PurchaseOrderListItemDto> PurchaseOrders);

public sealed record InvoicePaymentSubmissionDto(
    Guid Id,
    Guid InvoiceId,
    Guid ClientId,
    decimal Amount,
    string Currency,
    string Method,
    string Reference,
    Guid ProofDocumentId,
    InvoicePaymentSubmissionStatus Status,
    Guid SubmittedByUserId,
    Guid? ReviewedByUserId,
    string? ReviewNotes,
    DateTime? ReviewedAt,
    string? GatewayProvider,
    string? GatewayReference,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record ClientPortalPaymentProofUploadUrlDto(
    Guid DocumentId,
    string UploadUrl,
    DateTime ExpiresAtUtc);
