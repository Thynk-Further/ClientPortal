using Domain;

namespace Application.Messaging.Dtos;

public sealed record RealtimeMessagePayload(
    Guid MessageId,
    Guid ThreadId,
    Guid SenderId,
    string SenderRole,
    string Content,
    Guid? ReplyToMessageId,
    string? EmojiReaction,
    MessageAttachmentMetadataDto? Attachment,
    DateTime? AttachmentExpiresAt,
    bool IsSoftDeleted,
    DateTime? DeletedAt,
    long SequenceNumber,
    MessageStatus Status,
    DateTime SentAt);
