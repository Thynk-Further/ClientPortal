using Application.Abstractions;
using Application.Auth.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalDashboardQueryHandler
    : IRequestHandler<GetClientPortalDashboardQuery, Result<ClientPortalDashboardDto>>
{
    private static readonly Error UserNotFoundError = new(
        "Auth.UserNotFound",
        "Authenticated user was not found.",
        ErrorType.Forbidden);

    private readonly ICurrentUser _currentUser;
    private readonly IUserAuthenticationRepository _userAuthenticationRepository;
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IClientPortalDashboardReader _dashboardReader;

    public GetClientPortalDashboardQueryHandler(
        ICurrentUser currentUser,
        IUserAuthenticationRepository userAuthenticationRepository,
        ICurrentClientResolver currentClientResolver,
        IClientPortalDashboardReader dashboardReader)
    {
        _currentUser = currentUser;
        _userAuthenticationRepository = userAuthenticationRepository;
        _currentClientResolver = currentClientResolver;
        _dashboardReader = dashboardReader;
    }

    public async Task<Result<ClientPortalDashboardDto>> Handle(
        GetClientPortalDashboardQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<ClientPortalDashboardDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        User? user = await _userAuthenticationRepository.FindByIdAsync(
            _currentUser.UserId.Value,
            cancellationToken);
        if (user is null)
        {
            return Result<ClientPortalDashboardDto>.Failure(UserNotFoundError);
        }

        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalDashboardDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalDashboardDto dashboard = await _dashboardReader.GetDashboardAsync(
            clientIdResult.Value,
            user.Id,
            user.FullName,
            cancellationToken);

        return Result<ClientPortalDashboardDto>.Success(dashboard);
    }
}
