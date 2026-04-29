using Shared;

namespace Domain;

public sealed class Document : AggregateRoot<Guid>
{
    private readonly List<string> _tags = [];

    public Guid ClientId { get; private set; }

    public Guid? ProjectId { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public string Type { get; private set; } = string.Empty;

    public string S3Key { get; private set; } = string.Empty;

    public int CurrentVersion { get; private set; } = 1;

    public DocumentStatus Status { get; private set; } = DocumentStatus.Uploading;

    public IReadOnlyCollection<string> Tags => _tags.AsReadOnly();

    public Guid UploadedBy { get; private set; }

    private Document()
    {
    }

    private Document(
        Guid id,
        Guid clientId,
        Guid? projectId,
        string name,
        string type,
        string s3Key,
        int currentVersion,
        DocumentStatus status,
        IEnumerable<string>? tags,
        Guid uploadedBy)
        : base(id)
    {
        ClientId = clientId;
        ProjectId = projectId;
        Name = NormalizeName(name);
        Type = NormalizeType(type);
        S3Key = NormalizeS3Key(s3Key);
        CurrentVersion = NormalizeCurrentVersion(currentVersion);
        Status = status;
        UploadedBy = uploadedBy;
        SetTags(tags);
    }

    public static Document Create(
        Guid id,
        Guid clientId,
        Guid? projectId,
        string name,
        string type,
        string s3Key,
        int currentVersion,
        DocumentStatus status,
        IEnumerable<string>? tags,
        Guid uploadedBy)
    {
        return new Document(id, clientId, projectId, name, type, s3Key, currentVersion, status, tags, uploadedBy);
    }

    public void Rename(string name)
    {
        Name = NormalizeName(name);
        MarkUpdated();
    }

    public void ChangeType(string type)
    {
        Type = NormalizeType(type);
        MarkUpdated();
    }

    public void AssignToProject(Guid? projectId)
    {
        ProjectId = projectId;
        MarkUpdated();
    }

    public void ReplaceS3Key(string s3Key)
    {
        S3Key = NormalizeS3Key(s3Key);
        MarkUpdated();
    }

    public void SetCurrentVersion(int currentVersion)
    {
        CurrentVersion = NormalizeCurrentVersion(currentVersion);
        MarkUpdated();
    }

    public int IncrementVersion()
    {
        if (Status == DocumentStatus.Deleted)
        {
            throw new InvalidOperationException("Deleted documents cannot create new versions.");
        }

        CurrentVersion++;
        MarkUpdated();
        return CurrentVersion;
    }

    public void MarkUploadConfirmed()
    {
        if (Status != DocumentStatus.Uploading)
        {
            throw new InvalidOperationException("Only uploading documents can be confirmed.");
        }

        Status = DocumentStatus.Active;
        MarkUpdated();
    }

    public void SoftDelete()
    {
        if (Status == DocumentStatus.Deleted)
        {
            return;
        }

        Status = DocumentStatus.Deleted;
        MarkUpdated();
    }

    public void ReplaceTags(IEnumerable<string>? tags)
    {
        SetTags(tags);
        MarkUpdated();
    }

    private void SetTags(IEnumerable<string>? tags)
    {
        _tags.Clear();

        if (tags is not null)
        {
            foreach (string tag in tags)
            {
                string normalized = NormalizeTag(tag);
                if (_tags.Contains(normalized, StringComparer.Ordinal))
                {
                    continue;
                }

                _tags.Add(normalized);
            }
        }

    }

    private static string NormalizeName(string name)
    {
        return Guard.NotEmpty(name, nameof(name)).Trim();
    }

    private static string NormalizeType(string type)
    {
        return Guard.NotEmpty(type, nameof(type)).Trim().ToLowerInvariant();
    }

    private static string NormalizeS3Key(string s3Key)
    {
        return Guard.NotEmpty(s3Key, nameof(s3Key)).Trim();
    }

    private static int NormalizeCurrentVersion(int currentVersion)
    {
        if (currentVersion <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(currentVersion), "Current version must be greater than zero.");
        }

        return currentVersion;
    }

    private static string NormalizeTag(string tag)
    {
        return Guard.NotEmpty(tag, nameof(tag)).Trim().ToLowerInvariant();
    }
}
