using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalNoticesSummaryQueryHandler
    : IRequestHandler<GetClientPortalNoticesSummaryQuery, Result<ClientPortalNoticesSummaryDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly ICurrentUser _currentUser;
    private readonly IClientPortalNoticesReader _noticesReader;

    public GetClientPortalNoticesSummaryQueryHandler(
        ICurrentClientResolver currentClientResolver,
        ICurrentUser currentUser,
        IClientPortalNoticesReader noticesReader)
    {
        _currentClientResolver = currentClientResolver;
        _currentUser = currentUser;
        _noticesReader = noticesReader;
    }

    public async Task<Result<ClientPortalNoticesSummaryDto>> Handle(
        GetClientPortalNoticesSummaryQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<ClientPortalNoticesSummaryDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalNoticesSummaryDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalNoticesSummaryDto summary = await _noticesReader.GetSummaryAsync(
            clientIdResult.Value,
            _currentUser.UserId.Value,
            cancellationToken);

        return Result<ClientPortalNoticesSummaryDto>.Success(summary);
    }
}
