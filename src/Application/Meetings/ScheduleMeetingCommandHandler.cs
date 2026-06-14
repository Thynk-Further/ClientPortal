using Application.Abstractions;
using Application.Meetings.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Meetings;

public sealed class ScheduleMeetingCommandHandler : IRequestHandler<ScheduleMeetingCommand, Result<Guid>>
{
    private readonly IMeetingRepository _meetingRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ScheduleMeetingCommandHandler(
        IMeetingRepository meetingRepository,
        IUnitOfWork unitOfWork)
    {
        _meetingRepository = meetingRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(ScheduleMeetingCommand request, CancellationToken cancellationToken)
    {
        HashSet<Guid> attendees = request.Attendees
            .Where(attendeeId => attendeeId != Guid.Empty)
            .ToHashSet();

        Meeting meeting = Meeting.Create(
            id: Guid.CreateVersion7(),
            clientId: request.ClientId,
            title: request.Title,
            description: request.Description,
            scheduledAt: request.ScheduledAt,
            durationMinutes: request.DurationMinutes,
            meetingUrl: request.MeetingUrl,
            status: MeetingStatus.Pending,
            scheduledTimeZoneId: request.ScheduledTimeZoneId,
            attendees: attendees);

        meeting.RaiseRequestedEvent(DateTime.UtcNow);
        _meetingRepository.Add(meeting);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(meeting.Id);
    }
}
