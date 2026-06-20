using Application.Team.Abstractions;
using Application.Team.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Team;

public sealed class ListTeamMembersQueryHandler : IRequestHandler<ListTeamMembersQuery, Result<IReadOnlyList<TeamMemberDto>>>
{
    private readonly ITeamMemberRepository _teamMemberRepository;

    public ListTeamMembersQueryHandler(ITeamMemberRepository teamMemberRepository)
    {
        _teamMemberRepository = teamMemberRepository;
    }

    public async Task<Result<IReadOnlyList<TeamMemberDto>>> Handle(
        ListTeamMembersQuery request,
        CancellationToken cancellationToken)
    {
        IReadOnlyList<User> members = await _teamMemberRepository.ListStaffAsync(cancellationToken);
        IReadOnlyList<TeamMemberDto> result = members
            .Select(member => new TeamMemberDto(
                member.Id,
                member.FullName,
                member.Email.Value,
                member.Role.ToString(),
                member.IsActive))
            .ToList()
            .AsReadOnly();

        return Result<IReadOnlyList<TeamMemberDto>>.Success(result);
    }
}
