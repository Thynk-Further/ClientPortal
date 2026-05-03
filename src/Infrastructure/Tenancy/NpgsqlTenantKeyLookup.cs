using Application.Abstractions;
using Infrastructure.Persistence.Public;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Infrastructure.Tenancy;

public sealed class NpgsqlTenantKeyLookup : ITenantKeyLookup
{
    private readonly PublicDbContext _publicDbContext;
    private readonly ITenantKeyHasher _tenantKeyHasher;
    private readonly TenantKeyOptions _options;
    private readonly ILogger<NpgsqlTenantKeyLookup> _logger;

    public NpgsqlTenantKeyLookup(
        PublicDbContext publicDbContext,
        ITenantKeyHasher tenantKeyHasher,
        IOptions<TenantKeyOptions> options,
        ILogger<NpgsqlTenantKeyLookup> logger)
    {
        _publicDbContext = publicDbContext;
        _tenantKeyHasher = tenantKeyHasher;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<string?> ResolveSlugByTenantKeyAsync(string tenantKey, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.Pepper))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(tenantKey))
        {
            return null;
        }

        string trimmed = tenantKey.Trim();
        string hash;
        try
        {
            hash = _tenantKeyHasher.ComputeHash(trimmed);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Tenant key hashing is misconfigured.");
            return null;
        }

        PublicTenant? tenant = await _publicDbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(
                t => t.TenantKeyHash == hash && t.IsActive,
                cancellationToken);

        return tenant?.Slug;
    }
}
