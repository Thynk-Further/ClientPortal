using Application.Abstractions;
using Infrastructure.Tenancy;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;

namespace Api.Tenancy;

public sealed class TenantKeyTenantResolver : ITenantResolver
{
    private readonly ITenantKeyLookup _tenantKeyLookup;
    private readonly TenantKeyOptions _options;

    public TenantKeyTenantResolver(
        ITenantKeyLookup tenantKeyLookup,
        IOptions<TenantKeyOptions> options)
    {
        _tenantKeyLookup = tenantKeyLookup;
        _options = options.Value;
    }

    public async ValueTask<TenantId?> ResolveAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.Pepper))
        {
            return null;
        }

        string headerName = string.IsNullOrWhiteSpace(_options.HeaderName)
            ? "X-Tenant-Key"
            : _options.HeaderName.Trim();

        if (!httpContext.Request.Headers.TryGetValue(headerName, out StringValues headerValues))
        {
            return null;
        }

        string? raw = headerValues.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        string? slug = await _tenantKeyLookup.ResolveSlugByTenantKeyAsync(raw, cancellationToken);
        return slug is null ? null : new TenantId(slug);
    }
}
