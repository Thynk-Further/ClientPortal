using Infrastructure.Persistence.Public;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Persistence;

public sealed class DbInitializer : IDbInitializer
{
    private readonly PublicDbContext _publicDbContext;
    private readonly ITenantProvisioner _tenantProvisioner;
    private readonly ILogger<DbInitializer> _logger;

    public DbInitializer(
        PublicDbContext publicDbContext,
        ITenantProvisioner tenantProvisioner,
        ILogger<DbInitializer> logger)
    {
        _publicDbContext = publicDbContext;
        _tenantProvisioner = tenantProvisioner;
        _logger = logger;
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Applying public schema migrations.");
        await _publicDbContext.Database.MigrateAsync(cancellationToken);

        List<string> activeTenantSlugs = await _publicDbContext.Tenants
            .AsNoTracking()
            .Where(tenant => tenant.IsActive)
            .Select(tenant => tenant.Slug)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (activeTenantSlugs.Count == 0)
        {
            _logger.LogInformation("No active tenants found for tenant-schema migration.");
            return;
        }

        foreach (string tenantSlug in activeTenantSlugs)
        {
            _logger.LogInformation("Applying tenant schema provisioning for slug {TenantSlug}.", tenantSlug);
            await _tenantProvisioner.CreateSchemaAsync(tenantSlug, cancellationToken);
        }
    }
}
