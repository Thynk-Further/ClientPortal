using Shared;

namespace Domain;

public sealed class InAppNotification : Entity<Guid>
{
    public Guid UserId { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public string Body { get; private set; } = string.Empty;

    public string MetadataJson { get; private set; } = "{}";

    public bool IsRead { get; private set; }

    public DateTime? ReadAt { get; private set; }

    private InAppNotification()
    {
    }

    private InAppNotification(
        Guid id,
        Guid userId,
        string title,
        string body,
        string metadataJson)
        : base(id)
    {
        UserId = NormalizeId(userId, nameof(userId), "UserId");
        Title = Guard.NotEmpty(title, nameof(title)).Trim();
        Body = Guard.NotEmpty(body, nameof(body)).Trim();
        MetadataJson = string.IsNullOrWhiteSpace(metadataJson) ? "{}" : metadataJson.Trim();
        IsRead = false;
    }

    public static InAppNotification Create(
        Guid id,
        Guid userId,
        string title,
        string body,
        string metadataJson)
    {
        return new InAppNotification(id, userId, title, body, metadataJson);
    }

    public void MarkRead(DateTime readAtUtc)
    {
        DateTime normalized = readAtUtc.Kind == DateTimeKind.Utc ? readAtUtc : readAtUtc.ToUniversalTime();
        if (IsRead && ReadAt.HasValue && ReadAt.Value >= normalized)
        {
            return;
        }

        IsRead = true;
        ReadAt = normalized;
        MarkUpdated();
    }

    private static Guid NormalizeId(Guid value, string paramName, string propertyName)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException($"{propertyName} cannot be empty.", paramName);
        }

        return value;
    }
}
