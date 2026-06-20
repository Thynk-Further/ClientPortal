namespace Application.Team.Dtos;

public sealed record TeamMemberDto(
    Guid Id,
    string FullName,
    string Email,
    string Role,
    bool IsActive);

public sealed record InviteTeamMemberResultDto(Guid UserId);
