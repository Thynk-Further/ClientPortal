using Application.Abstractions;
using Application.Team.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Team;

public sealed class DeactivateTeamMemberCommandHandler : IRequestHandler<DeactivateTeamMemberCommand, Result>
{
    private static readonly Error MemberNotFoundError = new(
        "Team.MemberNotFound",
        "Team member was not found.",
        ErrorType.NotFound);

    private static readonly Error CannotDeactivateSelfError = new(
        "Team.CannotDeactivateSelf",
        "You cannot deactivate your own account.",
        ErrorType.Forbidden);

    private static readonly Error LastOwnerError = new(
        "Team.LastOwner",
        "At least one active owner is required.",
        ErrorType.Conflict);

    private readonly ITeamMemberRepository _teamMemberRepository;
    private readonly ICurrentUser _currentUser;
    private readonly IUnitOfWork _unitOfWork;

    public DeactivateTeamMemberCommandHandler(
        ITeamMemberRepository teamMemberRepository,
        ICurrentUser currentUser,
        IUnitOfWork unitOfWork)
    {
        _teamMemberRepository = teamMemberRepository;
        _currentUser = currentUser;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeactivateTeamMemberCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId == request.UserId)
        {
            return Result.Failure(CannotDeactivateSelfError);
        }

        User? member = await _teamMemberRepository.FindStaffByIdAsync(request.UserId, cancellationToken);
        if (member is null || !member.IsActive)
        {
            return Result.Failure(MemberNotFoundError);
        }

        if (member.Role == Role.Owner)
        {
            int ownerCount = await _teamMemberRepository.CountActiveOwnersAsync(cancellationToken);
            if (ownerCount <= 1)
            {
                return Result.Failure(LastOwnerError);
            }
        }

        member.Deactivate();
        member.RevokeRefreshTokenFamily();
        _teamMemberRepository.Update(member);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
