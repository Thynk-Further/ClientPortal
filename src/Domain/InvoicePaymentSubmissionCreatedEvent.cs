namespace Domain;

public sealed record InvoicePaymentSubmissionCreatedEvent(
    Guid SubmissionId,
    Guid InvoiceId,
    Guid ClientId,
    DateTime SubmittedAt) : IDomainEvent;
