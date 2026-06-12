using Shared;

namespace Application.Clients.Abstractions;

public interface ICurrentClientResolver
{
    Task<Result<Guid>> ResolveClientIdAsync(CancellationToken cancellationToken = default);
}
