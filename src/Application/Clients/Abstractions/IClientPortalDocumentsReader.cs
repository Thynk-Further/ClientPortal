using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientPortalDocumentsReader
{
    Task<ClientPortalDocumentsResultDto> GetDocumentsAsync(Guid clientId, CancellationToken cancellationToken);
}
