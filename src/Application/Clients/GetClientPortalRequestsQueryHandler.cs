using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalRequestsQueryHandler
    : IRequestHandler<GetClientPortalRequestsQuery, Result<ClientPortalRequestsResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IClientPortalRequestsReader _requestsReader;

    public GetClientPortalRequestsQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IClientPortalRequestsReader requestsReader)
    {
        _currentClientResolver = currentClientResolver;
        _requestsReader = requestsReader;
    }

    public async Task<Result<ClientPortalRequestsResultDto>> Handle(
        GetClientPortalRequestsQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalRequestsResultDto>.Failure(clientIdResult.Errors);
        }

        ClientPortalRequestsResultDto requests = await _requestsReader.GetRequestsAsync(
            clientIdResult.Value,
            cancellationToken);

        return Result<ClientPortalRequestsResultDto>.Success(requests);
    }
}
