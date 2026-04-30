namespace Application.Messaging.Dtos;

public sealed record RealtimeDeliveryReceiptPayload(
    Guid ThreadId,
    Guid RecipientId,
    int DeliveredCount,
    DateTime DeliveredAt);
