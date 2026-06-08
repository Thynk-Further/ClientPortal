using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientWorkspaceReader
{
    Task<ClientWorkspaceLandingDto> GetLandingAsync(CancellationToken cancellationToken = default);

    Task<ClientWorkspaceDto?> GetWorkspaceAsync(Guid clientId, CancellationToken cancellationToken = default);
}
