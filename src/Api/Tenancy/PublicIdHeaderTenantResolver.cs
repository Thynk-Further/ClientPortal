using Application.Abstractions;
using Infrastructure.Tenancy;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Api.Tenancy;

public sealed class PublicIdHeaderTenantResolver : ITenantResolver
{
    private readonly ITenantPublicIdLookup _tenantPublicIdLookup;
    private readonly TenantPublicIdHeaderOptions _options;

    public PublicIdHeaderTenantResolver(
        ITenantPublicIdLookup tenantPublicIdLookup,
        IOptions<TenantPublicIdHeaderOptions> options)
    {
        _tenantPublicIdLookup = tenantPublicIdLookup;
        _options = options.Value;
    }

    public async ValueTask<TenantId?> ResolveAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        if (!_options.Enabled)
        {
            return null;
        }

        string headerName = string.IsNullOrWhiteSpace(_options.HeaderName)
            ? "X-Tenant-Id"
            : _options.HeaderName.Trim();

        if (!httpContext.Request.Headers.TryGetValue(headerName, out StringValues headerValues))
        {
            return null;
        }

        string? raw = headerValues.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw) || !Guid.TryParse(raw.Trim(), out Guid tenantId))
        {
            return null;
        }

        string? slug = await _tenantPublicIdLookup.ResolveSlugByPublicIdAsync(tenantId, cancellationToken);
        return slug is null ? null : new TenantId(slug);
    }
}
