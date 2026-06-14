using Shared;

namespace Domain;

public sealed class Notice : AggregateRoot<Guid>
{
    public const int MaxAttachments = 5;

    private List<Guid>? _targetClientIds;
    private List<MessageAttachmentMetadata>? _attachments;

    public string Title { get; private set; } = string.Empty;

    public string Content { get; private set; } = string.Empty;

    public DateTime PublishedAt { get; private set; }

    public DateTime? ExpiresAt { get; private set; }

    public bool IsActive { get; private set; }

    public IReadOnlyCollection<Guid>? TargetClientIds => _targetClientIds?.AsReadOnly();

    public IReadOnlyCollection<MessageAttachmentMetadata>? Attachments => _attachments?.AsReadOnly();

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
        IEnumerable<Guid>? targetClientIds,
        IEnumerable<MessageAttachmentMetadata>? attachments)
        : base(id)
    {
        Title = NormalizeTitle(title);
        Content = NormalizeContent(content);
        PublishedAt = NormalizeTimestamp(publishedAt, nameof(publishedAt), "PublishedAt");
        ExpiresAt = NormalizeExpiry(PublishedAt, expiresAt);
        IsActive = isActive;
        SetTargetClientIds(targetClientIds);
        SetAttachments(attachments);
    }

    public static Notice Create(
        Guid id,
        string title,
        string content,
        DateTime publishedAt,
        DateTime? expiresAt,
        bool isActive,
        IEnumerable<Guid>? targetClientIds,
        IEnumerable<MessageAttachmentMetadata>? attachments = null)
    {
        return new Notice(id, title, content, publishedAt, expiresAt, isActive, targetClientIds, attachments);
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

    private void SetAttachments(IEnumerable<MessageAttachmentMetadata>? attachments)
    {
        if (attachments is null)
        {
            _attachments = null;
            return;
        }

        List<MessageAttachmentMetadata> normalizedAttachments = [];
        foreach (MessageAttachmentMetadata attachment in attachments)
        {
            normalizedAttachments.Add(NormalizeAttachment(attachment));
        }

        if (normalizedAttachments.Count > MaxAttachments)
        {
            throw new ArgumentException($"A notice cannot have more than {MaxAttachments} attachments.", nameof(attachments));
        }

        _attachments = normalizedAttachments;
    }

    private static MessageAttachmentMetadata NormalizeAttachment(MessageAttachmentMetadata attachment)
    {
        ArgumentNullException.ThrowIfNull(attachment);

        string fileName = Guard.NotEmpty(attachment.FileName, nameof(attachment.FileName)).Trim();
        if (fileName.Length > 256)
        {
            throw new ArgumentOutOfRangeException(nameof(attachment), "Attachment file name length cannot exceed 256 characters.");
        }

        string contentType = Guard.NotEmpty(attachment.ContentType, nameof(attachment.ContentType)).Trim();
        if (contentType.Length > 128)
        {
            throw new ArgumentOutOfRangeException(nameof(attachment), "Attachment content type length cannot exceed 128 characters.");
        }

        if (attachment.SizeBytes <= 0 || attachment.SizeBytes > 25 * 1024 * 1024)
        {
            throw new ArgumentOutOfRangeException(nameof(attachment), "Attachment size must be between 1 byte and 25 MB.");
        }

        string url = Guard.NotEmpty(attachment.Url, nameof(attachment.Url)).Trim();
        if (url.Length > 2048 || !Uri.IsWellFormedUriString(url, UriKind.Absolute))
        {
            throw new ArgumentException("Attachment URL is invalid.", nameof(attachment));
        }

        return new MessageAttachmentMetadata(fileName, contentType, attachment.SizeBytes, url);
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
