namespace Domain;

public sealed record ContractSignedEvent(
    Guid ContractId,
    Guid ClientId,
    DateTime SignedAt) : IDomainEvent;
