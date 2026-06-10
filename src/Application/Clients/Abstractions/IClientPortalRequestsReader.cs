using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientPortalRequestsReader
{
    Task<ClientPortalRequestsResultDto> GetRequestsAsync(
        Guid clientId,
        CancellationToken cancellationToken = default);
}
