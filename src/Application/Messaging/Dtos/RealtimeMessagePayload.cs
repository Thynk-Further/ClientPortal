using Domain;

namespace Application.Messaging.Dtos;

public sealed record RealtimeMessagePayload(
    Guid MessageId,
    Guid ThreadId,
    Guid SenderId,
    string SenderRole,
    string Content,
    long SequenceNumber,
    MessageStatus Status,
    DateTime SentAt);
