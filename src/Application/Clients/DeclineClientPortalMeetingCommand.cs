using MediatR;
using Shared;

namespace Application.Clients;

public sealed record DeclineClientPortalMeetingCommand(Guid MeetingId) : IRequest<Result>;
