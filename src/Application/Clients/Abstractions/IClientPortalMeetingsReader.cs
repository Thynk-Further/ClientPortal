using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientPortalMeetingsReader
{
    Task<ClientPortalMeetingsResultDto> GetMeetingsAsync(
        Guid clientId,
        CancellationToken cancellationToken = default);
}
