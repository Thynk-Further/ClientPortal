using Domain;
using Shared;

namespace Application.Clients.Abstractions;

public interface IClientPortalThreadAccessService
{
    Task<Result<Guid>> ResolveClientIdAsync(CancellationToken cancellationToken = default);

    Task<Result<MessageThread>> EnsureThreadAccessAsync(
        Guid threadId,
        Guid userId,
        bool addParticipantIfMissing,
        CancellationToken cancellationToken = default);
}
