using Application.Abstractions;
using Domain;
using Infrastructure.Persistence.Public;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Tenancy;

public sealed class NpgsqlTenantPublicRecordLookup : ITenantPublicRecordLookup
{
    private readonly PublicDbContext _publicDbContext;

    public NpgsqlTenantPublicRecordLookup(PublicDbContext publicDbContext)
    {
        _publicDbContext = publicDbContext;
    }

    public async Task<TenantPublicRecord?> FindBySlugAsync(
        string slug,
        CancellationToken cancellationToken = default)
    {
        string normalizedSlug = slug.Trim().ToLowerInvariant();

        PublicTenant? tenant = await _publicDbContext.Tenants
            .AsNoTracking()
            .SingleOrDefaultAsync(row => row.Slug == normalizedSlug, cancellationToken);

        return tenant is null ? null : MapTenant(tenant);
    }

    public async Task<TenantPublicRecord?> FindByDomainAsync(
        string domain,
        CancellationToken cancellationToken = default)
    {
        string normalizedDomain = domain.Trim().ToLowerInvariant();

        PublicTenant? tenant = await _publicDbContext.Tenants
            .AsNoTracking()
            .SingleOrDefaultAsync(row => row.Domain == normalizedDomain, cancellationToken);

        return tenant is null ? null : MapTenant(tenant);
    }

    private static TenantPublicRecord MapTenant(PublicTenant tenant)
    {
        if (!Enum.TryParse(tenant.Plan, ignoreCase: true, out Plan plan))
        {
            plan = Plan.Starter;
        }

        TenantSettings settings = TenantSettingsJsonParser.Parse(tenant.SettingsJson);

        return new TenantPublicRecord(
            tenant.Id,
            tenant.Slug,
            tenant.Name,
            tenant.Domain,
            plan,
            settings,
            tenant.IsActive);
    }
}
