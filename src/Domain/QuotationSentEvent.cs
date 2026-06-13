namespace Domain;

public sealed record QuotationSentEvent(
    Guid QuoteId,
    Guid? ClientId,
    DateTime SentAt) : IDomainEvent;
