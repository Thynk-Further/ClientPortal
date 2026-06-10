using Application.Abstractions;

namespace Api.Tenancy;

/// <summary>
/// Uses <c>tenantSlug</c> or <c>tenantId</c> claims from an authenticated JWT (runs after authentication middleware).
/// Removes the need for <c>X-Tenant-Key</c> / <c>X-Tenant-Id</c> on typical Bearer-authenticated API calls.
/// </summary>
public sealed class JwtClaimsTenantResolver : ITenantResolver
{
    private readonly ITenantPublicIdLookup _tenantPublicIdLookup;

    public JwtClaimsTenantResolver(ITenantPublicIdLookup tenantPublicIdLookup)
    {
        _tenantPublicIdLookup = tenantPublicIdLookup;
    }

    public async ValueTask<TenantId?> ResolveAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        if (httpContext.User.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        string? slug = httpContext.User.FindFirst("tenantSlug")?.Value;
        if (!string.IsNullOrWhiteSpace(slug))
        {
            return new TenantId(slug);
        }

        string? tenantIdRaw = httpContext.User.FindFirst("tenantId")?.Value;
        if (!Guid.TryParse(tenantIdRaw, out Guid tenantId))
        {
            return null;
        }

        slug = await _tenantPublicIdLookup.ResolveSlugByPublicIdAsync(tenantId, cancellationToken);
        return string.IsNullOrWhiteSpace(slug) ? null : new TenantId(slug);
    }
}
