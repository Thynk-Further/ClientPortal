namespace Application.Abstractions;

public interface ITenantPublicIdLookup
{
    Task<string?> ResolveSlugByPublicIdAsync(Guid tenantId, CancellationToken cancellationToken = default);
}
