namespace Domain;

public sealed record PurchaseOrderApprovedEvent(
    Guid PurchaseOrderId,
    Guid ClientId,
    Guid QuotationId,
    DateTime ApprovedAt) : IDomainEvent;
