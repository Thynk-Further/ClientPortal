using Shared;

namespace Domain;

public sealed class Meeting : AggregateRoot<Guid>
{
    private List<Guid> _attendees = [];

    public Guid ClientId { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public string Description { get; private set; } = string.Empty;

    public DateTime ScheduledAt { get; private set; }

    public string ScheduledTimeZoneId { get; private set; } = MeetingTimeZoneDefaults.DefaultId;

    public int DurationMinutes { get; private set; }

    public string MeetingUrl { get; private set; } = string.Empty;

    public MeetingStatus Status { get; private set; } = MeetingStatus.Pending;

    public IReadOnlyCollection<Guid> Attendees => _attendees.AsReadOnly();

    private Meeting()
    {
    }

    private Meeting(
        Guid id,
        Guid clientId,
        string title,
        string description,
        DateTime scheduledAt,
        int durationMinutes,
        string meetingUrl,
        MeetingStatus status,
        string scheduledTimeZoneId,
        IEnumerable<Guid> attendees)
        : base(id)
    {
        ClientId = NormalizeId(clientId, nameof(clientId), "ClientId");
        Title = NormalizeTitle(title);
        Description = NormalizeDescription(description);
        ScheduledAt = NormalizeScheduledAt(scheduledAt);
        ScheduledTimeZoneId = NormalizeTimeZoneId(scheduledTimeZoneId);
        DurationMinutes = NormalizeDuration(durationMinutes);
        MeetingUrl = NormalizeMeetingUrl(meetingUrl);
        Status = status;
        SetAttendees(attendees);
    }

    public static Meeting Create(
        Guid id,
        Guid clientId,
        string title,
        string description,
        DateTime scheduledAt,
        int durationMinutes,
        string meetingUrl,
        MeetingStatus status = MeetingStatus.Pending,
        string scheduledTimeZoneId = MeetingTimeZoneDefaults.DefaultId,
        IEnumerable<Guid>? attendees = null)
    {
        return new Meeting(
            id,
            clientId,
            title,
            description,
            scheduledAt,
            durationMinutes,
            meetingUrl,
            status,
            scheduledTimeZoneId,
            attendees ?? []);
    }

    public void RaiseRequestedEvent(DateTime requestedAt)
    {
        DateTime normalizedRequestedAt = requestedAt.Kind == DateTimeKind.Utc
            ? requestedAt
            : requestedAt.ToUniversalTime();
        AddDomainEvent(new MeetingRequestedEvent(Id, ClientId, ScheduledAt, normalizedRequestedAt));
    }

    public void RaiseScheduledEvent(DateTime scheduledAt)
    {
        DateTime normalizedScheduledAt = NormalizeScheduledAt(scheduledAt);
        AddDomainEvent(new MeetingScheduledEvent(Id, ClientId, normalizedScheduledAt, ScheduledAt));
    }

    public void Accept()
    {
        if (Status != MeetingStatus.Pending)
        {
            throw new InvalidOperationException("Only pending meetings can be accepted.");
        }

        Status = MeetingStatus.Scheduled;
        MarkUpdated();
    }

    public void Decline()
    {
        if (Status != MeetingStatus.Pending)
        {
            throw new InvalidOperationException("Only pending meetings can be declined.");
        }

        Status = MeetingStatus.Declined;
        MarkUpdated();
    }

    public void UpdateDetails(string title, string description, int durationMinutes, string meetingUrl)
    {
        Title = NormalizeTitle(title);
        Description = NormalizeDescription(description);
        DurationMinutes = NormalizeDuration(durationMinutes);
        MeetingUrl = NormalizeMeetingUrl(meetingUrl);
        MarkUpdated();
    }

    public void Reschedule(DateTime scheduledAt)
    {
        if (Status == MeetingStatus.Cancelled)
        {
            throw new InvalidOperationException("Cancelled meetings cannot be rescheduled.");
        }

        ScheduledAt = NormalizeScheduledAt(scheduledAt);
        MarkUpdated();
    }

    public void Cancel()
    {
        if (Status == MeetingStatus.Cancelled)
        {
            return;
        }

        Status = MeetingStatus.Cancelled;
        MarkUpdated();
    }

    public void Complete()
    {
        if (Status == MeetingStatus.Cancelled)
        {
            throw new InvalidOperationException("Cancelled meetings cannot be completed.");
        }

        Status = MeetingStatus.Completed;
        MarkUpdated();
    }

    public void AddAttendee(Guid attendeeId)
    {
        Guid normalizedAttendeeId = NormalizeId(attendeeId, nameof(attendeeId), "AttendeeId");
        if (_attendees.Contains(normalizedAttendeeId))
        {
            return;
        }

        _attendees.Add(normalizedAttendeeId);
        MarkUpdated();
    }

    public void RemoveAttendee(Guid attendeeId)
    {
        if (attendeeId == Guid.Empty)
        {
            throw new ArgumentException("AttendeeId cannot be empty.", nameof(attendeeId));
        }

        bool removed = _attendees.Remove(attendeeId);
        if (removed)
        {
            MarkUpdated();
        }
    }

    public void ReplaceAttendees(IEnumerable<Guid> attendees)
    {
        SetAttendees(attendees);
        MarkUpdated();
    }

    private void SetAttendees(IEnumerable<Guid> attendees)
    {
        ArgumentNullException.ThrowIfNull(attendees);
        _attendees.Clear();

        foreach (Guid attendeeId in attendees)
        {
            Guid normalizedAttendeeId = NormalizeId(attendeeId, nameof(attendees), "AttendeeId");
            if (_attendees.Contains(normalizedAttendeeId))
            {
                continue;
            }

            _attendees.Add(normalizedAttendeeId);
        }
    }

    private static Guid NormalizeId(Guid value, string paramName, string propertyName)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException($"{propertyName} cannot be empty.", paramName);
        }

        return value;
    }

    private static string NormalizeTitle(string title)
    {
        return Guard.NotEmpty(title, nameof(title)).Trim();
    }

    private static string NormalizeDescription(string description)
    {
        return Guard.NotEmpty(description, nameof(description)).Trim();
    }

    private static DateTime NormalizeScheduledAt(DateTime scheduledAt)
    {
        if (scheduledAt == default)
        {
            throw new ArgumentException("ScheduledAt cannot be default.", nameof(scheduledAt));
        }

        return scheduledAt.Kind == DateTimeKind.Utc ? scheduledAt : scheduledAt.ToUniversalTime();
    }

    private static string NormalizeTimeZoneId(string timeZoneId)
    {
        string normalized = Guard.NotEmpty(timeZoneId, nameof(timeZoneId)).Trim();
        if (normalized.Length > 64)
        {
            throw new ArgumentException("ScheduledTimeZoneId cannot exceed 64 characters.", nameof(timeZoneId));
        }

        return normalized;
    }

    private static int NormalizeDuration(int durationMinutes)
    {
        if (durationMinutes <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(durationMinutes), "DurationMinutes must be greater than zero.");
        }

        if (durationMinutes > 24 * 60)
        {
            throw new ArgumentOutOfRangeException(nameof(durationMinutes), "DurationMinutes cannot exceed 24 hours.");
        }

        return durationMinutes;
    }

    private static string NormalizeMeetingUrl(string meetingUrl)
    {
        string normalizedUrl = Guard.NotEmpty(meetingUrl, nameof(meetingUrl)).Trim();
        if (!Uri.TryCreate(normalizedUrl, UriKind.Absolute, out Uri? uri) || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp))
        {
            throw new ArgumentException("MeetingUrl must be a valid absolute HTTP/HTTPS URL.", nameof(meetingUrl));
        }

        return normalizedUrl;
    }
}
