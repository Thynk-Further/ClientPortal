using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Auth.Abstractions;
using Infrastructure.Auth;
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
        services.Configure<JwtOptions>(options =>
        {
            IConfigurationSection section = configuration.GetSection(JwtOptions.SectionName);
            options.Issuer = section["Issuer"] ?? string.Empty;
            options.Audience = section["Audience"] ?? string.Empty;
            options.PrivateKeyPem = section["PrivateKeyPem"] ?? string.Empty;
            options.PublicKeyPem = section["PublicKeyPem"] ?? string.Empty;
            options.AccessTokenLifetimeMinutes = int.TryParse(section["AccessTokenLifetimeMinutes"], out int minutes) ? minutes : 15;
        });
        services.Configure<RefreshTokenOptions>(options =>
        {
            IConfigurationSection section = configuration.GetSection(RefreshTokenOptions.SectionName);
            options.TokenSizeBytes = int.TryParse(section["TokenSizeBytes"], out int tokenSizeBytes) ? tokenSizeBytes : 32;
            options.LifetimeDays = int.TryParse(section["LifetimeDays"], out int lifetimeDays) ? lifetimeDays : 7;
            options.Iterations = int.TryParse(section["Iterations"], out int iterations) ? iterations : 4;
            options.MemorySizeKb = int.TryParse(section["MemorySizeKb"], out int memorySizeKb) ? memorySizeKb : 65536;
            options.DegreeOfParallelism = int.TryParse(section["DegreeOfParallelism"], out int degreeOfParallelism) ? degreeOfParallelism : 2;
            options.Pepper = section["Pepper"] ?? string.Empty;
        });
        services.AddDbContext<TenantDbContext>();
        services.AddDbContext<PublicDbContext>();
        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
        services.AddScoped<IClientRepository, ClientRepository>();
        services.AddScoped<IOnboardingChecklistRepository, OnboardingChecklistRepository>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IRefreshTokenService, Argon2RefreshTokenService>();
        services.AddScoped<ITenantDbContextFactory, TenantDbContextFactory>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<ITenantProvisioner, TenantProvisioner>();
        services.AddScoped<IDbInitializer, DbInitializer>();
        services.AddScoped<ITenantRlsPolicyManager, TenantRlsPolicyManager>();

        return services;
    }
}
