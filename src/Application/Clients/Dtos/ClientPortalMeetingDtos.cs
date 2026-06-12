using Application.Meetings.Dtos;

namespace Application.Clients.Dtos;

public sealed record ClientPortalMeetingsResultDto(
    IReadOnlyList<MeetingListItemDto> Meetings);
