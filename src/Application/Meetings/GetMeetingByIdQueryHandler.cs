using Application.Meetings.Abstractions;
using Application.Meetings.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Meetings;

public sealed class GetMeetingByIdQueryHandler : IRequestHandler<GetMeetingByIdQuery, Result<MeetingListItemDto>>
{
    private static readonly Error MeetingNotFoundError = new(
        "Meetings.NotFound",
        "Meeting was not found.",
        ErrorType.NotFound);

    private readonly IMeetingRepository _meetingRepository;

    public GetMeetingByIdQueryHandler(IMeetingRepository meetingRepository)
    {
        _meetingRepository = meetingRepository;
    }

    public async Task<Result<MeetingListItemDto>> Handle(GetMeetingByIdQuery request, CancellationToken cancellationToken)
    {
        Meeting? meeting = await _meetingRepository.FindByIdAsync(request.MeetingId, cancellationToken);
        if (meeting is null)
        {
            return Result<MeetingListItemDto>.Failure(MeetingNotFoundError);
        }

        MeetingListItemDto dto = new(
            meeting.Id,
            meeting.ClientId,
            meeting.Title,
            meeting.Description,
            meeting.ScheduledAt,
            meeting.DurationMinutes,
            meeting.MeetingUrl,
            meeting.Status,
            meeting.Attendees);

        return Result<MeetingListItemDto>.Success(dto);
    }
}
