using Application.Abstractions;
using Application.Auth.Abstractions;
using Application.Clients.Abstractions;
using Application.Team.Abstractions;
using Application.Team.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Team;

public sealed class InviteTeamMemberCommandHandler : IRequestHandler<InviteTeamMemberCommand, Result<InviteTeamMemberResultDto>>
{
    private static readonly Error EmailTakenError = new(
        "Team.EmailTaken",
        "A user with this email already exists.",
        ErrorType.Conflict);

    private static readonly Error PlanUserLimitReachedError = new(
        "Team.PlanUserLimitReached",
        "Your plan user limit has been reached.",
        ErrorType.Conflict);

    private static readonly Error ForbiddenRoleAssignmentError = new(
        "Team.ForbiddenRoleAssignment",
        "Only an owner can assign the owner role.",
        ErrorType.Forbidden);

    private readonly ITeamMemberRepository _teamMemberRepository;
    private readonly IPublicTenantRepository _publicTenantRepository;
    private readonly ICurrentTenant _currentTenant;
    private readonly ICurrentUser _currentUser;
    private readonly IClientInvitationTokenService _invitationTokenService;
    private readonly IStaffInvitationTokenStore _staffInvitationTokenStore;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUnitOfWork _unitOfWork;

    public InviteTeamMemberCommandHandler(
        ITeamMemberRepository teamMemberRepository,
        IPublicTenantRepository publicTenantRepository,
        ICurrentTenant currentTenant,
        ICurrentUser currentUser,
        IClientInvitationTokenService invitationTokenService,
        IStaffInvitationTokenStore staffInvitationTokenStore,
        IPasswordHasher passwordHasher,
        IUnitOfWork unitOfWork)
    {
        _teamMemberRepository = teamMemberRepository;
        _publicTenantRepository = publicTenantRepository;
        _currentTenant = currentTenant;
        _currentUser = currentUser;
        _invitationTokenService = invitationTokenService;
        _staffInvitationTokenStore = staffInvitationTokenStore;
        _passwordHasher = passwordHasher;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<InviteTeamMemberResultDto>> Handle(
        InviteTeamMemberCommand request,
        CancellationToken cancellationToken)
    {
        if (request.Role == Role.Owner && !string.Equals(_currentUser.Role, Role.Owner.ToString(), StringComparison.Ordinal))
        {
            return Result<InviteTeamMemberResultDto>.Failure(ForbiddenRoleAssignmentError);
        }

        if (string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Result<InviteTeamMemberResultDto>.Failure(new Error(
                "Tenant.Unresolved",
                "Tenant could not be resolved.",
                ErrorType.NotFound));
        }

        PublicTenantRecord? tenant = await _publicTenantRepository.GetBySlugAsync(_currentTenant.Slug, cancellationToken);
        if (tenant is null)
        {
            return Result<InviteTeamMemberResultDto>.Failure(new Error(
                "Tenant.Unresolved",
                "Tenant could not be resolved.",
                ErrorType.NotFound));
        }

        int maxUsers = tenant.Plan.GetFeatureFlags().MaxUsers;
        int activeStaffCount = await _teamMemberRepository.CountActiveStaffAsync(cancellationToken);
        if (activeStaffCount >= maxUsers)
        {
            return Result<InviteTeamMemberResultDto>.Failure(PlanUserLimitReachedError);
        }

        EmailAddress email = new(request.Email);
        if (await _teamMemberRepository.ExistsByEmailAsync(email, cancellationToken))
        {
            return Result<InviteTeamMemberResultDto>.Failure(EmailTakenError);
        }

        Guid userId = Guid.CreateVersion7();
        ClientInvitationTokenIssueResult inviteToken = _invitationTokenService.Issue();
        string temporaryPassword = Guid.CreateVersion7().ToString("N");
        User staffUser = User.Create(
            id: userId,
            email: email,
            fullName: request.FullName,
            passwordHash: _passwordHasher.Hash(temporaryPassword),
            role: request.Role,
            isActive: false);

        await _unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            _teamMemberRepository.Add(staffUser);
            await _staffInvitationTokenStore.StoreAsync(
                staffUser.Id,
                inviteToken.TokenHash,
                inviteToken.ExpiresAtUtc,
                cancellationToken);

            staffUser.RaiseStaffInvitedEvent(
                inviteToken.Token,
                tenant.Slug,
                DateTime.UtcNow);

            await _unitOfWork.SaveChangesAsync(cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);
        }
        catch
        {
            await _unitOfWork.RollbackAsync(cancellationToken);
            throw;
        }

        return Result<InviteTeamMemberResultDto>.Success(new InviteTeamMemberResultDto(userId));
    }
}
