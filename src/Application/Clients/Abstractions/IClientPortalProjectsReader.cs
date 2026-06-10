using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientPortalProjectsReader
{
    Task<ClientPortalProjectsResultDto> GetProjectsAsync(
        Guid clientId,
        CancellationToken cancellationToken = default);
}
