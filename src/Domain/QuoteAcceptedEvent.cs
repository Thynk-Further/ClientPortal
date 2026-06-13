namespace Domain;

public sealed record QuoteAcceptedEvent(
    Guid QuoteId,
    Guid? ClientId,
    DateTime AcceptedAt) : IDomainEvent;
