using Infrastructure.Persistence;
using Infrastructure.Persistence.Public;
using Infrastructure.Persistence.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<TenantDbContext>();
        services.AddDbContext<PublicDbContext>();
        services.AddScoped<ITenantDbContextFactory, TenantDbContextFactory>();
        services.AddScoped<ITenantProvisioner, TenantProvisioner>();
        services.AddScoped<IDbInitializer, DbInitializer>();
        services.AddScoped<ITenantRlsPolicyManager, TenantRlsPolicyManager>();

        return services;
    }
}
