namespace Domain;

public sealed record RfqSubmittedEvent(
    Guid RfqId,
    Guid ClientId,
    DateTime SubmittedAt) : IDomainEvent;
