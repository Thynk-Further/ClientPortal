using MediatR;
using Shared;

namespace Application.Team;

public sealed record DeactivateTeamMemberCommand(Guid UserId) : IRequest<Result>;
