using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientWorkspaceLandingQueryHandler
    : IRequestHandler<GetClientWorkspaceLandingQuery, Result<ClientWorkspaceLandingDto>>
{
    private readonly IClientWorkspaceReader _clientWorkspaceReader;

    public GetClientWorkspaceLandingQueryHandler(IClientWorkspaceReader clientWorkspaceReader)
    {
        _clientWorkspaceReader = clientWorkspaceReader;
    }

    public async Task<Result<ClientWorkspaceLandingDto>> Handle(
        GetClientWorkspaceLandingQuery request,
        CancellationToken cancellationToken)
    {
        ClientWorkspaceLandingDto landing = await _clientWorkspaceReader.GetLandingAsync(cancellationToken);
        return Result<ClientWorkspaceLandingDto>.Success(landing);
    }
}
