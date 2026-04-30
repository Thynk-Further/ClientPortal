namespace Application.Messaging.Dtos;

public sealed record RealtimeReadReceiptPayload(
    Guid ThreadId,
    Guid ReaderId,
    int ReadCount,
    DateTime ReadAt);
