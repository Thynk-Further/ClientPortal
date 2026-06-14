using MediatR;
using Shared;

namespace Application.Clients;

public sealed record AcceptClientPortalMeetingCommand(Guid MeetingId) : IRequest<Result>;
