using Application.Clients.Dtos;

namespace Application.Clients.Abstractions;

public interface IClientPortalInvoicesReader
{
    Task<ClientPortalInvoicesResultDto> GetInvoicesAsync(Guid clientId, CancellationToken cancellationToken);
}
