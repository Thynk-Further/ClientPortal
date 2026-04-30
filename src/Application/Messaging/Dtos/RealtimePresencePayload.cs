namespace Application.Messaging.Dtos;

public sealed record RealtimePresencePayload(
    Guid UserId,
    bool IsOnline,
    DateTime At);
