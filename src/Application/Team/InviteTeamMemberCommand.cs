using Application.Team.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Team;

public sealed record InviteTeamMemberCommand(
    string FullName,
    string Email,
    Role Role) : IRequest<Result<InviteTeamMemberResultDto>>;
