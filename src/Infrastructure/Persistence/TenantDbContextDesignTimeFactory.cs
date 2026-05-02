using Application.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore.Design;

namespace Infrastructure.Persistence;

public sealed class TenantDbContextDesignTimeFactory : IDesignTimeDbContextFactory<TenantDbContext>
{
    public TenantDbContext CreateDbContext(string[] args)
    {
        const string fallbackConnectionString = "Host=localhost;Port=5433;Database=clientportal;Username=postgres;Password=postgres";
        ICurrentTenant currentTenant = new DesignTimeCurrentTenant();
        return new TenantDbContext(fallbackConnectionString, currentTenant);
    }

    private sealed class DesignTimeCurrentTenant : ICurrentTenant
    {
        public string? TenantId => "00000000-0000-0000-0000-000000000000";

        public string? Slug => "design-time";

        public TenantSettings? Settings => TenantSettings.Default();

        public bool IsResolved => true;
    }
}
