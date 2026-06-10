using Microsoft.Extensions.Primitives;

namespace Api.Tenancy;

public sealed class SlugHeaderTenantResolver : ITenantResolver
{
    public const string DefaultHeaderName = "X-Tenant-Slug";

    public ValueTask<TenantId?> ResolveAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(httpContext);

        if (!httpContext.Request.Headers.TryGetValue(DefaultHeaderName, out StringValues headerValues))
        {
            return ValueTask.FromResult<TenantId?>(null);
        }

        string? slug = headerValues.FirstOrDefault()?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(slug) || !IsValidSlug(slug))
        {
            return ValueTask.FromResult<TenantId?>(null);
        }

        return ValueTask.FromResult<TenantId?>(new TenantId(slug));
    }

    private static bool IsValidSlug(string slug)
    {
        if (slug.StartsWith('-') || slug.EndsWith('-'))
        {
            return false;
        }

        return slug.All(ch => char.IsAsciiLetterOrDigit(ch) || ch == '-');
    }
}
