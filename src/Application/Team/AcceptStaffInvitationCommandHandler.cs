using Application.Abstractions;
using Application.Auth.Abstractions;
using Application.Clients.Abstractions;
using Application.Team.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Team;

public sealed class AcceptStaffInvitationCommandHandler : IRequestHandler<AcceptStaffInvitationCommand, Result>
{
    private static readonly Error InvalidInviteTokenError = new(
        "Team.InvalidInviteToken",
        "Invitation token is invalid or expired.",
        ErrorType.Forbidden);

    private readonly ITeamMemberRepository _teamMemberRepository;
    private readonly IClientInvitationTokenService _invitationTokenService;
    private readonly IStaffInvitationTokenStore _staffInvitationTokenStore;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;

    public AcceptStaffInvitationCommandHandler(
        ITeamMemberRepository teamMemberRepository,
        IClientInvitationTokenService invitationTokenService,
        IStaffInvitationTokenStore staffInvitationTokenStore,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork)
    {
        _teamMemberRepository = teamMemberRepository;
        _invitationTokenService = invitationTokenService;
        _staffInvitationTokenStore = staffInvitationTokenStore;
        _passwordHasher = passwordHasher;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(AcceptStaffInvitationCommand request, CancellationToken cancellationToken)
    {
        string tokenHash = _invitationTokenService.Hash(request.Token);
        StaffInvitationTokenRecord? tokenRecord = await _staffInvitationTokenStore.FindValidByHashAsync(
            tokenHash,
            cancellationToken);

        if (tokenRecord is null || tokenRecord.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return Result.Failure(InvalidInviteTokenError);
        }

        User? staffUser = await _teamMemberRepository.FindStaffByIdAsync(tokenRecord.UserId, cancellationToken);
        if (staffUser is null)
        {
            return Result.Failure(InvalidInviteTokenError);
        }

        staffUser.UpdatePasswordHash(_passwordHasher.Hash(request.Password));
        staffUser.Activate();
        _teamMemberRepository.Update(staffUser);

        await _staffInvitationTokenStore.MarkUsedAsync(
            staffUser.Id,
            tokenRecord.TokenHash,
            DateTime.UtcNow,
            cancellationToken);

        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
