using Shared;

namespace Domain;

public sealed class NoticeReadReceipt : Entity<Guid>
{
    public Guid NoticeId { get; private set; }

    public Guid UserId { get; private set; }

    public DateTime ReadAt { get; private set; }

    private NoticeReadReceipt()
    {
    }

    private NoticeReadReceipt(Guid id, Guid noticeId, Guid userId, DateTime readAt)
        : base(id)
    {
        NoticeId = NormalizeId(noticeId, nameof(noticeId), "NoticeId");
        UserId = NormalizeId(userId, nameof(userId), "UserId");
        ReadAt = NormalizeTimestamp(readAt);
    }

    public static NoticeReadReceipt Create(Guid id, Guid noticeId, Guid userId, DateTime readAt)
    {
        return new NoticeReadReceipt(id, noticeId, userId, readAt);
    }

    private static Guid NormalizeId(Guid value, string paramName, string propertyName)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException($"{propertyName} cannot be empty.", paramName);
        }

        return value;
    }

    private static DateTime NormalizeTimestamp(DateTime timestamp)
    {
        if (timestamp == default)
        {
            throw new ArgumentException("ReadAt cannot be default.", nameof(timestamp));
        }

        return timestamp.Kind == DateTimeKind.Utc ? timestamp : timestamp.ToUniversalTime();
    }
}
