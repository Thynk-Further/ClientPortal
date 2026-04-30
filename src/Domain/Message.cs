using Shared;

namespace Domain;

public sealed class Message : Entity<Guid>
{
    public Guid ThreadId { get; private set; }

    public Guid SenderId { get; private set; }

    public string SenderRole { get; private set; } = string.Empty;

    public string ClientMessageId { get; private set; } = string.Empty;

    public long SequenceNumber { get; private set; }

    public string Content { get; private set; } = string.Empty;

    public Guid? ReplyToMessageId { get; private set; }

    public string? EmojiReaction { get; private set; }

    public string? AttachmentFileName { get; private set; }

    public string? AttachmentContentType { get; private set; }

    public long? AttachmentSizeBytes { get; private set; }

    public string? AttachmentUrl { get; private set; }

    public DateTime? AttachmentExpiresAt { get; private set; }

    public bool IsSoftDeleted { get; private set; }

    public DateTime? DeletedAt { get; private set; }

    public Guid? DeletedBy { get; private set; }

    public string? DeletionReason { get; private set; }

    public DateTime? ModeratedAt { get; private set; }

    public Guid? ModeratedBy { get; private set; }

    public string? ModerationReason { get; private set; }

    public MessageStatus Status { get; private set; } = MessageStatus.Sent;

    public DateTime SentAt { get; private set; }

    public DateTime? DeliveredAt { get; private set; }

    public DateTime? ReadAt { get; private set; }

    private Message()
    {
    }

    private Message(
        Guid id,
        Guid threadId,
        Guid senderId,
        string senderRole,
        string clientMessageId,
        long sequenceNumber,
        string content,
        DateTime sentAt,
        Guid? replyToMessageId,
        string? emojiReaction,
        MessageAttachmentMetadata? attachment,
        DateTime? attachmentExpiresAt)
        : base(id)
    {
        ThreadId = NormalizeRequiredId(threadId, nameof(threadId), "ThreadId");
        SenderId = NormalizeRequiredId(senderId, nameof(senderId), "SenderId");
        SenderRole = NormalizeSenderRole(senderRole);
        ClientMessageId = NormalizeClientMessageId(clientMessageId);
        SequenceNumber = NormalizeSequenceNumber(sequenceNumber);
        Content = NormalizeContent(content);
        ReplyToMessageId = NormalizeOptionalId(replyToMessageId, nameof(replyToMessageId), "ReplyToMessageId");
        EmojiReaction = NormalizeEmojiReaction(emojiReaction);
        if (attachment is not null)
        {
            AttachmentFileName = NormalizeAttachmentFileName(attachment.FileName);
            AttachmentContentType = NormalizeAttachmentContentType(attachment.ContentType);
            AttachmentSizeBytes = NormalizeAttachmentSize(attachment.SizeBytes);
            AttachmentUrl = NormalizeAttachmentUrl(attachment.Url);
            AttachmentExpiresAt = NormalizeAttachmentExpiry(attachmentExpiresAt, sentAt);
        }

        SentAt = NormalizeTimestamp(sentAt, nameof(sentAt), "SentAt");
        Status = MessageStatus.Sent;
    }

    public static Message Create(
        Guid id,
        Guid threadId,
        Guid senderId,
        string senderRole,
        string clientMessageId,
        long sequenceNumber,
        string content,
        DateTime sentAt,
        Guid? replyToMessageId = null,
        string? emojiReaction = null,
        MessageAttachmentMetadata? attachment = null,
        DateTime? attachmentExpiresAt = null)
    {
        return new Message(
            id,
            threadId,
            senderId,
            senderRole,
            clientMessageId,
            sequenceNumber,
            content,
            sentAt,
            replyToMessageId,
            emojiReaction,
            attachment,
            attachmentExpiresAt);
    }

    public void MarkModerated(Guid moderatedBy, string reason, DateTime moderatedAtUtc)
    {
        ModeratedBy = NormalizeRequiredId(moderatedBy, nameof(moderatedBy), "ModeratedBy");
        ModerationReason = Guard.NotEmpty(reason, nameof(reason)).Trim();
        ModeratedAt = NormalizeTimestamp(moderatedAtUtc, nameof(moderatedAtUtc), "ModeratedAt");
        MarkUpdated();
    }

    public void SoftDelete(Guid deletedBy, string reason, DateTime deletedAtUtc)
    {
        if (IsSoftDeleted)
        {
            return;
        }

        DeletedBy = NormalizeRequiredId(deletedBy, nameof(deletedBy), "DeletedBy");
        DeletionReason = Guard.NotEmpty(reason, nameof(reason)).Trim();
        DeletedAt = NormalizeTimestamp(deletedAtUtc, nameof(deletedAtUtc), "DeletedAt");
        IsSoftDeleted = true;
        MarkUpdated();
    }

    public void MarkDelivered(DateTime deliveredAt)
    {
        if (Status is MessageStatus.Delivered or MessageStatus.Read)
        {
            return;
        }

        DateTime normalizedDeliveredAt = NormalizeTimestamp(deliveredAt, nameof(deliveredAt), "DeliveredAt");
        if (normalizedDeliveredAt < SentAt)
        {
            throw new ArgumentException("DeliveredAt cannot be earlier than SentAt.", nameof(deliveredAt));
        }

        DeliveredAt = normalizedDeliveredAt;
        Status = MessageStatus.Delivered;
        MarkUpdated();
    }

    public void MarkRead(DateTime readAt)
    {
        DateTime normalizedReadAt = NormalizeTimestamp(readAt, nameof(readAt), "ReadAt");
        if (normalizedReadAt < SentAt)
        {
            throw new ArgumentException("ReadAt cannot be earlier than SentAt.", nameof(readAt));
        }

        if (ReadAt.HasValue && normalizedReadAt <= ReadAt.Value)
        {
            return;
        }

        if (!DeliveredAt.HasValue || DeliveredAt.Value > normalizedReadAt)
        {
            DeliveredAt = normalizedReadAt;
        }

        ReadAt = normalizedReadAt;
        Status = MessageStatus.Read;
        MarkUpdated();
    }

    private static Guid NormalizeRequiredId(Guid value, string paramName, string propertyName)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException($"{propertyName} cannot be empty.", paramName);
        }

        return value;
    }

    private static string NormalizeSenderRole(string senderRole)
    {
        return Guard.NotEmpty(senderRole, nameof(senderRole)).Trim();
    }

    private static string NormalizeClientMessageId(string clientMessageId)
    {
        return Guard.NotEmpty(clientMessageId, nameof(clientMessageId)).Trim();
    }

    private static long NormalizeSequenceNumber(long sequenceNumber)
    {
        if (sequenceNumber <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(sequenceNumber), "SequenceNumber must be greater than zero.");
        }

        return sequenceNumber;
    }

    private static string NormalizeContent(string content)
    {
        return Guard.NotEmpty(content, nameof(content)).Trim();
    }

    private static Guid? NormalizeOptionalId(Guid? value, string paramName, string propertyName)
    {
        if (value.HasValue && value.Value == Guid.Empty)
        {
            throw new ArgumentException($"{propertyName} cannot be empty when provided.", paramName);
        }

        return value;
    }

    private static string? NormalizeEmojiReaction(string? emojiReaction)
    {
        if (string.IsNullOrWhiteSpace(emojiReaction))
        {
            return null;
        }

        string trimmed = emojiReaction.Trim();
        if (trimmed.Length > 32)
        {
            throw new ArgumentOutOfRangeException(nameof(emojiReaction), "EmojiReaction length cannot exceed 32 characters.");
        }

        return trimmed;
    }

    private static string NormalizeAttachmentFileName(string fileName)
    {
        string trimmed = Guard.NotEmpty(fileName, nameof(fileName)).Trim();
        if (trimmed.Length > 256)
        {
            throw new ArgumentOutOfRangeException(nameof(fileName), "Attachment file name length cannot exceed 256 characters.");
        }

        return trimmed;
    }

    private static string NormalizeAttachmentContentType(string contentType)
    {
        string trimmed = Guard.NotEmpty(contentType, nameof(contentType)).Trim();
        if (trimmed.Length > 128)
        {
            throw new ArgumentOutOfRangeException(nameof(contentType), "Attachment content type length cannot exceed 128 characters.");
        }

        return trimmed;
    }

    private static long NormalizeAttachmentSize(long sizeBytes)
    {
        if (sizeBytes <= 0 || sizeBytes > 25 * 1024 * 1024)
        {
            throw new ArgumentOutOfRangeException(nameof(sizeBytes), "Attachment size must be between 1 byte and 25 MB.");
        }

        return sizeBytes;
    }

    private static string NormalizeAttachmentUrl(string url)
    {
        string trimmed = Guard.NotEmpty(url, nameof(url)).Trim();
        if (trimmed.Length > 2048 || !Uri.IsWellFormedUriString(trimmed, UriKind.Absolute))
        {
            throw new ArgumentException("Attachment URL is invalid.", nameof(url));
        }

        return trimmed;
    }

    private static DateTime NormalizeAttachmentExpiry(DateTime? attachmentExpiresAt, DateTime sentAt)
    {
        if (!attachmentExpiresAt.HasValue)
        {
            throw new ArgumentException("Attachment expiry is required when attachment metadata is provided.", nameof(attachmentExpiresAt));
        }

        DateTime normalized = attachmentExpiresAt.Value.Kind == DateTimeKind.Utc
            ? attachmentExpiresAt.Value
            : attachmentExpiresAt.Value.ToUniversalTime();

        if (normalized <= sentAt)
        {
            throw new ArgumentException("Attachment expiry must be after SentAt.", nameof(attachmentExpiresAt));
        }

        return normalized;
    }

    private static DateTime NormalizeTimestamp(DateTime timestamp, string paramName, string propertyName)
    {
        if (timestamp == default)
        {
            throw new ArgumentException($"{propertyName} cannot be default.", paramName);
        }

        return timestamp.Kind == DateTimeKind.Utc ? timestamp : timestamp.ToUniversalTime();
    }
}
