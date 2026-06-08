namespace Api.Tenancy;

/// <summary>
/// Uses the <c>tenantSlug</c> claim from an authenticated JWT (runs after authentication middleware in the pipeline).
/// Removes the need for <c>X-Tenant-Key</c> / <c>X-Tenant-Id</c> on typical Bearer-authenticated API calls.
/// </summary>
public sealed class JwtClaimsTenantResolver : ITenantResolver
{
    public ValueTask<TenantId?> ResolveAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        if (httpContext.User.Identity?.IsAuthenticated != true)
        {
            return ValueTask.FromResult<TenantId?>(null);
        }

        string? slug = httpContext.User.FindFirst("tenantSlug")?.Value;
        if (string.IsNullOrWhiteSpace(slug))
        {
            return ValueTask.FromResult<TenantId?>(null);
        }

        return ValueTask.FromResult<TenantId?>(new TenantId(slug));
    }
}
