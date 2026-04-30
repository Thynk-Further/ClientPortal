using Domain;

namespace Application.Messaging.Dtos;

public sealed record MessageHistoryItemDto(
    Guid Id,
    Guid ThreadId,
    Guid SenderId,
    string SenderRole,
    string ClientMessageId,
    long SequenceNumber,
    string Content,
    Guid? ReplyToMessageId,
    string? EmojiReaction,
    MessageAttachmentMetadataDto? Attachment,
    DateTime? AttachmentExpiresAt,
    bool IsSoftDeleted,
    DateTime? DeletedAt,
    Guid? DeletedBy,
    string? DeletionReason,
    DateTime? ModeratedAt,
    Guid? ModeratedBy,
    string? ModerationReason,
    MessageStatus Status,
    DateTime SentAt,
    DateTime? DeliveredAt,
    DateTime? ReadAt);
