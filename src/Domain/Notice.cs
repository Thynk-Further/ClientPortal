using Shared;

namespace Domain;

public sealed class Notice : AggregateRoot<Guid>
{
    private List<Guid>? _targetClientIds;

    public string Title { get; private set; } = string.Empty;

    public string Content { get; private set; } = string.Empty;

    public DateTime PublishedAt { get; private set; }

    public DateTime? ExpiresAt { get; private set; }

    public bool IsActive { get; private set; }

    public IReadOnlyCollection<Guid>? TargetClientIds => _targetClientIds?.AsReadOnly();

    private Notice()
    {
    }

    private Notice(
        Guid id,
        string title,
        string content,
        DateTime publishedAt,
        DateTime? expiresAt,
        bool isActive,
        IEnumerable<Guid>? targetClientIds)
        : base(id)
    {
        Title = NormalizeTitle(title);
        Content = NormalizeContent(content);
        PublishedAt = NormalizeTimestamp(publishedAt, nameof(publishedAt), "PublishedAt");
        ExpiresAt = NormalizeExpiry(PublishedAt, expiresAt);
        IsActive = isActive;
        SetTargetClientIds(targetClientIds);
    }

    public static Notice Create(
        Guid id,
        string title,
        string content,
        DateTime publishedAt,
        DateTime? expiresAt,
        bool isActive,
        IEnumerable<Guid>? targetClientIds)
    {
        return new Notice(id, title, content, publishedAt, expiresAt, isActive, targetClientIds);
    }

    public void UpdateDetails(string title, string content, DateTime? expiresAt, IEnumerable<Guid>? targetClientIds)
    {
        Title = NormalizeTitle(title);
        Content = NormalizeContent(content);
        ExpiresAt = NormalizeExpiry(PublishedAt, expiresAt);
        SetTargetClientIds(targetClientIds);
        MarkUpdated();
    }

    public void Publish(DateTime publishedAt)
    {
        DateTime normalizedPublishedAt = NormalizeTimestamp(publishedAt, nameof(publishedAt), "PublishedAt");
        PublishedAt = normalizedPublishedAt;
        ExpiresAt = NormalizeExpiry(normalizedPublishedAt, ExpiresAt);
        IsActive = true;
        MarkUpdated();
    }

    public void Activate()
    {
        IsActive = true;
        MarkUpdated();
    }

    public void Deactivate()
    {
        IsActive = false;
        MarkUpdated();
    }

    private void SetTargetClientIds(IEnumerable<Guid>? targetClientIds)
    {
        if (targetClientIds is null)
        {
            _targetClientIds = null;
            return;
        }

        List<Guid> normalizedClientIds = [];
        foreach (Guid targetClientId in targetClientIds)
        {
            if (targetClientId == Guid.Empty)
            {
                throw new ArgumentException("TargetClientIds cannot contain empty values.", nameof(targetClientIds));
            }

            if (normalizedClientIds.Contains(targetClientId))
            {
                continue;
            }

            normalizedClientIds.Add(targetClientId);
        }

        _targetClientIds = normalizedClientIds;
    }

    private static string NormalizeTitle(string title)
    {
        return Guard.NotEmpty(title, nameof(title)).Trim();
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

    private static DateTime? NormalizeExpiry(DateTime publishedAt, DateTime? expiresAt)
    {
        if (!expiresAt.HasValue)
        {
            return null;
        }

        DateTime normalizedExpiry = NormalizeTimestamp(expiresAt.Value, nameof(expiresAt), "ExpiresAt");
        if (normalizedExpiry <= publishedAt)
        {
            throw new ArgumentException("ExpiresAt must be later than PublishedAt.", nameof(expiresAt));
        }

        return normalizedExpiry;
    }
}
