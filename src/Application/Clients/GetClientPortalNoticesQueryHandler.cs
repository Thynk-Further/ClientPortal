using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalNoticesQueryHandler
    : IRequestHandler<GetClientPortalNoticesQuery, Result<ClientPortalNoticesResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly ICurrentUser _currentUser;
    private readonly IClientPortalNoticesReader _noticesReader;

    public GetClientPortalNoticesQueryHandler(
        ICurrentClientResolver currentClientResolver,
        ICurrentUser currentUser,
        IClientPortalNoticesReader noticesReader)
    {
        _currentClientResolver = currentClientResolver;
        _currentUser = currentUser;
        _noticesReader = noticesReader;
    }

    public async Task<Result<ClientPortalNoticesResultDto>> Handle(
        GetClientPortalNoticesQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<ClientPortalNoticesResultDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalNoticesResultDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalNoticesResultDto notices = await _noticesReader.GetNoticesAsync(
            clientIdResult.Value,
            _currentUser.UserId.Value,
            cancellationToken);

        return Result<ClientPortalNoticesResultDto>.Success(notices);
    }
}
