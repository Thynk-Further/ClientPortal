using Domain;

namespace Application.Meetings.Dtos;

public sealed record MeetingListItemDto(
    Guid Id,
    Guid ClientId,
    string Title,
    string Description,
    DateTime ScheduledAt,
    string ScheduledTimeZoneId,
    int DurationMinutes,
    string MeetingUrl,
    MeetingStatus Status,
    IReadOnlyCollection<Guid> Attendees);
