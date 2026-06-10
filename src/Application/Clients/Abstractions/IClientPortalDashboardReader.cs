using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientPortalDashboardReader
{
    Task<ClientPortalDashboardDto> GetDashboardAsync(
        Guid clientId,
        Guid userId,
        string greetingName,
        CancellationToken cancellationToken = default);
}
