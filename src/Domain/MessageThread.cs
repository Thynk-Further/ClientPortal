using Shared;

namespace Domain;

public sealed class MessageThread : AggregateRoot<Guid>
{
    private readonly List<Guid> _participants = [];

    public Guid ClientId { get; private set; }

    public Guid? ProjectId { get; private set; }

    public IReadOnlyCollection<Guid> Participants => _participants.AsReadOnly();

    public string Subject { get; private set; } = string.Empty;

    public DateTime LastMessageAt { get; private set; }

    private MessageThread()
    {
    }

    private MessageThread(
        Guid id,
        Guid clientId,
        Guid? projectId,
        IEnumerable<Guid> participants,
        string subject,
        DateTime lastMessageAt)
        : base(id)
    {
        ClientId = NormalizeRequiredId(clientId, nameof(clientId), "ClientId");
        ProjectId = NormalizeOptionalId(projectId, nameof(projectId), "ProjectId");
        Subject = NormalizeSubject(subject);
        LastMessageAt = NormalizeTimestamp(lastMessageAt, nameof(lastMessageAt), "LastMessageAt");
        SetParticipants(participants);
    }

    public static MessageThread Create(
        Guid id,
        Guid clientId,
        Guid? projectId,
        IEnumerable<Guid> participants,
        string subject,
        DateTime lastMessageAt)
    {
        return new MessageThread(id, clientId, projectId, participants, subject, lastMessageAt);
    }

    public void AddParticipant(Guid participantId)
    {
        Guid normalizedParticipantId = NormalizeRequiredId(participantId, nameof(participantId), "ParticipantId");
        if (_participants.Contains(normalizedParticipantId))
        {
            return;
        }

        _participants.Add(normalizedParticipantId);
        MarkUpdated();
    }

    public void RemoveParticipant(Guid participantId)
    {
        if (participantId == Guid.Empty)
        {
            throw new ArgumentException("ParticipantId cannot be empty.", nameof(participantId));
        }

        bool removed = _participants.Remove(participantId);
        if (removed)
        {
            MarkUpdated();
        }
    }

    public void UpdateSubject(string subject)
    {
        Subject = NormalizeSubject(subject);
        MarkUpdated();
    }

    public void TouchLastMessageAt(DateTime lastMessageAt)
    {
        DateTime normalizedLastMessageAt = NormalizeTimestamp(lastMessageAt, nameof(lastMessageAt), "LastMessageAt");
        if (normalizedLastMessageAt < LastMessageAt)
        {
            throw new ArgumentException("LastMessageAt cannot move backward.", nameof(lastMessageAt));
        }

        LastMessageAt = normalizedLastMessageAt;
        MarkUpdated();
    }

    private void SetParticipants(IEnumerable<Guid> participants)
    {
        ArgumentNullException.ThrowIfNull(participants);

        _participants.Clear();
        foreach (Guid participantId in participants)
        {
            Guid normalizedParticipantId = NormalizeRequiredId(participantId, nameof(participants), "ParticipantId");
            if (_participants.Contains(normalizedParticipantId))
            {
                continue;
            }

            _participants.Add(normalizedParticipantId);
        }

        if (_participants.Count == 0)
        {
            throw new ArgumentException("Message thread must have at least one participant.", nameof(participants));
        }
    }

    private static Guid NormalizeRequiredId(Guid value, string paramName, string propertyName)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException($"{propertyName} cannot be empty.", paramName);
        }

        return value;
    }

    private static Guid? NormalizeOptionalId(Guid? value, string paramName, string propertyName)
    {
        if (value.HasValue && value.Value == Guid.Empty)
        {
            throw new ArgumentException($"{propertyName} cannot be empty when provided.", paramName);
        }

        return value;
    }

    private static string NormalizeSubject(string subject)
    {
        return Guard.NotEmpty(subject, nameof(subject)).Trim();
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
