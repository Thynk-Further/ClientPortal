using Application.Abstractions;
using Infrastructure.Persistence.Public;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Tenancy;

public sealed class NpgsqlTenantPublicIdLookup : ITenantPublicIdLookup
{
    private readonly PublicDbContext _publicDbContext;

    public NpgsqlTenantPublicIdLookup(PublicDbContext publicDbContext)
    {
        _publicDbContext = publicDbContext;
    }

    public async Task<string?> ResolveSlugByPublicIdAsync(Guid tenantId, CancellationToken cancellationToken = default)
    {
        return await _publicDbContext.Tenants
            .AsNoTracking()
            .Where(t => t.Id == tenantId && t.IsActive)
            .Select(t => t.Slug)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
