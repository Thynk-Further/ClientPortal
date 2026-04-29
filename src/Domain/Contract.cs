using Shared;

namespace Domain;

public sealed class Contract : AggregateRoot<Guid>
{
    private readonly List<string> _parties = [];

    public Guid ClientId { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public ContractStatus Status { get; private set; } = ContractStatus.Draft;

    public DateTime? SignedAt { get; private set; }

    public DateTime? ExpiresAt { get; private set; }

    public string S3Key { get; private set; } = string.Empty;

    public IReadOnlyCollection<string> Parties => _parties.AsReadOnly();

    private Contract()
    {
    }

    private Contract(
        Guid id,
        Guid clientId,
        string title,
        ContractStatus status,
        DateTime? signedAtUtc,
        DateTime? expiresAtUtc,
        string s3Key,
        IEnumerable<string>? parties)
        : base(id)
    {
        ClientId = clientId;
        Title = NormalizeTitle(title);
        Status = status;
        SignedAt = NormalizeOptionalUtc(signedAtUtc, nameof(signedAtUtc), allowFuture: false);
        ExpiresAt = NormalizeOptionalUtc(expiresAtUtc, nameof(expiresAtUtc), allowFuture: true);
        S3Key = NormalizeS3Key(s3Key);
        SetParties(parties);
        ValidateStateConsistency();
    }

    public static Contract Create(
        Guid id,
        Guid clientId,
        string title,
        string s3Key,
        IEnumerable<string>? parties = null,
        DateTime? expiresAtUtc = null)
    {
        return new Contract(id, clientId, title, ContractStatus.Draft, null, expiresAtUtc, s3Key, parties);
    }

    public void Rename(string title)
    {
        Title = NormalizeTitle(title);
        MarkUpdated();
    }

    public void ReplaceS3Key(string s3Key)
    {
        S3Key = NormalizeS3Key(s3Key);
        MarkUpdated();
    }

    public void ReplaceParties(IEnumerable<string>? parties)
    {
        SetParties(parties);
        MarkUpdated();
    }

    public void SetExpiry(DateTime? expiresAtUtc)
    {
        ExpiresAt = NormalizeOptionalUtc(expiresAtUtc, nameof(expiresAtUtc), allowFuture: true);
        ValidateStateConsistency();
        MarkUpdated();
    }

    public void SendForSigning()
    {
        if (Status != ContractStatus.Draft)
        {
            throw new InvalidOperationException("Only draft contracts can be sent for signing.");
        }

        EnsureNotExpiredAt(DateTime.UtcNow);
        Status = ContractStatus.SentForSigning;
        MarkUpdated();
    }

    public void MarkSigned(DateTime signedAtUtc)
    {
        if (Status != ContractStatus.SentForSigning)
        {
            throw new InvalidOperationException("Only contracts sent for signing can be signed.");
        }

        DateTime normalizedSignedAt = NormalizeOptionalUtc(signedAtUtc, nameof(signedAtUtc), allowFuture: false)!.Value;
        EnsureNotExpiredAt(normalizedSignedAt);
        SignedAt = normalizedSignedAt;
        Status = ContractStatus.Signed;
        AddDomainEvent(new ContractSignedEvent(Id, ClientId, normalizedSignedAt));
        MarkUpdated();
    }

    public void Expire(DateTime expiredAtUtc)
    {
        DateTime normalizedExpiredAt = NormalizeOptionalUtc(expiredAtUtc, nameof(expiredAtUtc), allowFuture: false)!.Value;
        if (Status is ContractStatus.Signed or ContractStatus.Cancelled)
        {
            throw new InvalidOperationException("Signed or cancelled contracts cannot be expired.");
        }

        if (ExpiresAt.HasValue && normalizedExpiredAt < ExpiresAt.Value)
        {
            throw new InvalidOperationException("Contract cannot expire before configured expiry timestamp.");
        }

        Status = ContractStatus.Expired;
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status is ContractStatus.Signed or ContractStatus.Expired)
        {
            throw new InvalidOperationException("Signed or expired contracts cannot be cancelled.");
        }

        Status = ContractStatus.Cancelled;
        MarkUpdated();
    }

    private void SetParties(IEnumerable<string>? parties)
    {
        _parties.Clear();

        if (parties is null)
        {
            return;
        }

        foreach (string party in parties)
        {
            string normalized = NormalizeParty(party);
            if (_parties.Contains(normalized, StringComparer.Ordinal))
            {
                continue;
            }

            _parties.Add(normalized);
        }
    }

    private void ValidateStateConsistency()
    {
        if (Status == ContractStatus.Signed && !SignedAt.HasValue)
        {
            throw new InvalidOperationException("Signed contracts must have a signature timestamp.");
        }

        if (SignedAt.HasValue && Status != ContractStatus.Signed)
        {
            throw new InvalidOperationException("Only signed contracts can store a signature timestamp.");
        }

        if (SignedAt.HasValue && ExpiresAt.HasValue && SignedAt.Value > ExpiresAt.Value)
        {
            throw new InvalidOperationException("Signature timestamp cannot be later than expiry timestamp.");
        }
    }

    private void EnsureNotExpiredAt(DateTime timestampUtc)
    {
        if (ExpiresAt.HasValue && timestampUtc > ExpiresAt.Value)
        {
            throw new InvalidOperationException("Contract is expired and cannot change to this state.");
        }
    }

    private static string NormalizeTitle(string title)
    {
        return Guard.NotEmpty(title, nameof(title)).Trim();
    }

    private static string NormalizeS3Key(string s3Key)
    {
        return Guard.NotEmpty(s3Key, nameof(s3Key)).Trim();
    }

    private static string NormalizeParty(string party)
    {
        return Guard.NotEmpty(party, nameof(party)).Trim();
    }

    private static DateTime? NormalizeOptionalUtc(DateTime? timestamp, string paramName, bool allowFuture)
    {
        if (!timestamp.HasValue)
        {
            return null;
        }

        DateTime normalized = timestamp.Value;
        if (normalized.Kind == DateTimeKind.Local)
        {
            normalized = normalized.ToUniversalTime();
        }
        else if (normalized.Kind == DateTimeKind.Unspecified)
        {
            normalized = DateTime.SpecifyKind(normalized, DateTimeKind.Utc);
        }

        if (!allowFuture && normalized > DateTime.UtcNow)
        {
            throw new ArgumentException("Timestamp cannot be in the future.", paramName);
        }

        return normalized;
    }
}
