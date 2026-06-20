using Application.Abstractions;
using Application.Team.Abstractions;
using Application.Team.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Team;

public sealed class UpdateTeamMemberRoleCommandHandler
    : IRequestHandler<UpdateTeamMemberRoleCommand, Result<TeamMemberDto>>
{
    private static readonly Error MemberNotFoundError = new(
        "Team.MemberNotFound",
        "Team member was not found.",
        ErrorType.NotFound);

    private static readonly Error ForbiddenRoleAssignmentError = new(
        "Team.ForbiddenRoleAssignment",
        "Only an owner can assign the owner role.",
        ErrorType.Forbidden);

    private static readonly Error LastOwnerError = new(
        "Team.LastOwner",
        "At least one active owner is required.",
        ErrorType.Conflict);

    private readonly ITeamMemberRepository _teamMemberRepository;
    private readonly ICurrentUser _currentUser;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateTeamMemberRoleCommandHandler(
        ITeamMemberRepository teamMemberRepository,
        ICurrentUser currentUser,
        IUnitOfWork unitOfWork)
    {
        _teamMemberRepository = teamMemberRepository;
        _currentUser = currentUser;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<TeamMemberDto>> Handle(
        UpdateTeamMemberRoleCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Role == Role.Owner && !string.Equals(_currentUser.Role, Role.Owner.ToString(), StringComparison.Ordinal))
        {
            return Result<TeamMemberDto>.Failure(ForbiddenRoleAssignmentError);
        }

        User? member = await _teamMemberRepository.FindStaffByIdAsync(request.UserId, cancellationToken);
        if (member is null || !member.IsActive)
        {
            return Result<TeamMemberDto>.Failure(MemberNotFoundError);
        }

        if (member.Role == Role.Owner && request.Role != Role.Owner)
        {
            int ownerCount = await _teamMemberRepository.CountActiveOwnersAsync(cancellationToken);
            if (ownerCount <= 1)
            {
                return Result<TeamMemberDto>.Failure(LastOwnerError);
            }
        }

        member.ChangeRole(request.Role);
        _teamMemberRepository.Update(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        TeamMemberDto result = new(
            member.Id,
            member.FullName,
            member.Email.Value,
            member.Role.ToString(),
            member.IsActive);

        return Result<TeamMemberDto>.Success(result);
    }
}
