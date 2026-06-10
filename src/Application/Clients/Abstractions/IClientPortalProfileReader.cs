using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientPortalProfileReader
{
    Task<ClientPortalProfileDto> GetProfileAsync(
        Guid clientId,
        CancellationToken cancellationToken = default);
}
