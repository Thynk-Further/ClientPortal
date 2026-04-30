namespace Application.Messaging.Dtos;

public sealed record RealtimeTypingPayload(
    Guid ThreadId,
    Guid UserId,
    bool IsTyping,
    DateTime At);
