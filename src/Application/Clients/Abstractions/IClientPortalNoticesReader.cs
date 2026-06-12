using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientPortalNoticesReader
{
    Task<ClientPortalNoticesResultDto> GetNoticesAsync(
        Guid clientId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<ClientPortalNoticesSummaryDto> GetSummaryAsync(
        Guid clientId,
        Guid userId,
        CancellationToken cancellationToken = default);
}
