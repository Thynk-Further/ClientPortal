namespace Application.Abstractions;

/// <summary>
/// Resolves a tenant slug from an opaque tenant API key (plaintext), using stored hashes in public.tenants.
/// </summary>
public interface ITenantKeyLookup
{
    Task<string?> ResolveSlugByTenantKeyAsync(string tenantKey, CancellationToken cancellationToken = default);
}
