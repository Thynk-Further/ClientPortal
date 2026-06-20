using Application.Team.Dtos;
using MediatR;
using Shared;

namespace Application.Team;

public sealed record ListTeamMembersQuery : IRequest<Result<IReadOnlyList<TeamMemberDto>>>;
