using Application.Abstractions;
using Domain;
using Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Public;

public sealed class NpgsqlPublicTenantRepository : IPublicTenantRepository
{
    private readonly PublicDbContext _publicDbContext;

    public NpgsqlPublicTenantRepository(PublicDbContext publicDbContext)
    {
        _publicDbContext = publicDbContext;
    }

    public async Task<PublicTenantRecord?> GetBySlugAsync(
        string slug,
        CancellationToken cancellationToken = default)
    {
        string normalizedSlug = slug.Trim().ToLowerInvariant();

        PublicTenant? tenant = await _publicDbContext.Tenants
            .AsNoTracking()
            .SingleOrDefaultAsync(row => row.Slug == normalizedSlug, cancellationToken);

        return tenant is null ? null : MapTenant(tenant);
    }

    public async Task UpdateSettingsAsync(
        Guid tenantId,
        TenantSettings settings,
        CancellationToken cancellationToken = default)
    {
        PublicTenant? tenant = await _publicDbContext.Tenants
            .SingleOrDefaultAsync(row => row.Id == tenantId, cancellationToken);

        if (tenant is null)
        {
            throw new InvalidOperationException($"Tenant {tenantId} was not found.");
        }

        tenant.SettingsJson = TenantSettingsJsonParser.ToJson(settings);
        await _publicDbContext.SaveChangesAsync(cancellationToken);
    }

    private static PublicTenantRecord MapTenant(PublicTenant tenant)
    {
        Plan plan = Enum.TryParse(tenant.Plan, ignoreCase: true, out Plan parsedPlan)
            ? parsedPlan
            : Plan.Starter;

        TenantSettings settings = TenantSettingsJsonParser.Parse(tenant.SettingsJson);

        return new PublicTenantRecord(
            tenant.Id,
            tenant.Slug,
            tenant.Name,
            tenant.Domain,
            plan,
            settings,
            tenant.IsActive);
    }
}
