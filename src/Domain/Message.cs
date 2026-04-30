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
        DateTime sentAt)
        : base(id)
    {
        ThreadId = NormalizeRequiredId(threadId, nameof(threadId), "ThreadId");
        SenderId = NormalizeRequiredId(senderId, nameof(senderId), "SenderId");
        SenderRole = NormalizeSenderRole(senderRole);
        ClientMessageId = NormalizeClientMessageId(clientMessageId);
        SequenceNumber = NormalizeSequenceNumber(sequenceNumber);
        Content = NormalizeContent(content);
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
        DateTime sentAt)
    {
        return new Message(id, threadId, senderId, senderRole, clientMessageId, sequenceNumber, content, sentAt);
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

    private static DateTime NormalizeTimestamp(DateTime timestamp, string paramName, string propertyName)
    {
        if (timestamp == default)
        {
            throw new ArgumentException($"{propertyName} cannot be default.", paramName);
        }

        return timestamp.Kind == DateTimeKind.Utc ? timestamp : timestamp.ToUniversalTime();
    }
}
