namespace Domain;

public sealed record InvoicePaymentSubmissionApprovedEvent(
    Guid SubmissionId,
    Guid InvoiceId,
    Guid ClientId,
    DateTime ApprovedAt) : IDomainEvent;
