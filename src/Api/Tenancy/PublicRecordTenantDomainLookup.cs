using Application.Abstractions;
using Api.Tenancy;

namespace Api.Tenancy;

public sealed class PublicRecordTenantDomainLookup : ITenantDomainLookup
{
    private readonly ITenantPublicRecordLookup _tenantPublicRecordLookup;

    public PublicRecordTenantDomainLookup(ITenantPublicRecordLookup tenantPublicRecordLookup)
    {
        _tenantPublicRecordLookup = tenantPublicRecordLookup;
    }

    public async ValueTask<TenantId?> FindByDomainAsync(string domain, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(domain))
        {
            return null;
        }

        TenantPublicRecord? tenant = await _tenantPublicRecordLookup.FindByDomainAsync(
            domain.Trim().ToLowerInvariant(),
            cancellationToken);

        return tenant is null || !tenant.IsActive
            ? null
            : new TenantId(tenant.Slug);
    }
}
