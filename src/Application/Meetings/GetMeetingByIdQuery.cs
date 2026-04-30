using Application.Meetings.Dtos;
using MediatR;
using Shared;

namespace Application.Meetings;

public sealed record GetMeetingByIdQuery(Guid MeetingId) : IRequest<Result<MeetingListItemDto>>;
