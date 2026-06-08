using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientWorkspaceQueryHandler : IRequestHandler<GetClientWorkspaceQuery, Result<ClientWorkspaceDto>>
{
    private static readonly Error ClientNotFoundError = new(
        "Clients.NotFound",
        "Client was not found.",
        ErrorType.NotFound);

    private readonly IClientWorkspaceReader _clientWorkspaceReader;

    public GetClientWorkspaceQueryHandler(IClientWorkspaceReader clientWorkspaceReader)
    {
        _clientWorkspaceReader = clientWorkspaceReader;
    }

    public async Task<Result<ClientWorkspaceDto>> Handle(
        GetClientWorkspaceQuery request,
        CancellationToken cancellationToken)
    {
        ClientWorkspaceDto? workspace = await _clientWorkspaceReader.GetWorkspaceAsync(
            request.ClientId,
            cancellationToken);

        if (workspace is null)
        {
            return Result<ClientWorkspaceDto>.Failure(ClientNotFoundError);
        }

        return Result<ClientWorkspaceDto>.Success(workspace);
    }
}
