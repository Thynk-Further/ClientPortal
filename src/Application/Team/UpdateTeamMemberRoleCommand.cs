using Application.Team.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Team;

public sealed record UpdateTeamMemberRoleCommand(
    Guid UserId,
    Role Role) : IRequest<Result<TeamMemberDto>>;
