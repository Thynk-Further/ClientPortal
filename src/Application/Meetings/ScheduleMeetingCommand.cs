using MediatR;
using Shared;

namespace Application.Meetings;

public sealed record ScheduleMeetingCommand(
    Guid ClientId,
    string Title,
    string Description,
    DateTime ScheduledAt,
    int DurationMinutes,
    string MeetingUrl,
    string ScheduledTimeZoneId,
    IReadOnlyCollection<Guid> Attendees) : IRequest<Result<Guid>>;
