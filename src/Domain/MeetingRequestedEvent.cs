namespace Domain;

public sealed record MeetingRequestedEvent(
    Guid MeetingId,
    Guid ClientId,
    DateTime ScheduledAt,
    DateTime RequestedAt) : IDomainEvent;
