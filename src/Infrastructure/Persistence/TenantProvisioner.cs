using Application.Abstractions;
using Domain;
using Infrastructure.Persistence.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using Shared;

namespace Infrastructure.Persistence;

public sealed class TenantProvisioner : ITenantProvisioner
{
    private readonly string _postgresConnectionString;
    private readonly ITenantRlsPolicyManager _tenantRlsPolicyManager;
    private readonly ILogger<TenantProvisioner> _logger;

    public TenantProvisioner(
        IConfiguration configuration,
        ITenantRlsPolicyManager tenantRlsPolicyManager,
        ILogger<TenantProvisioner> logger)
    {
        _postgresConnectionString = Guard.NotEmpty(
            configuration.GetConnectionString("Postgres"),
            "ConnectionStrings:Postgres");
        _tenantRlsPolicyManager = tenantRlsPolicyManager;
        _logger = logger;
    }

    public async Task CreateSchemaAsync(string slug, CancellationToken cancellationToken = default)
    {
        string normalizedSlug = NormalizeSlug(slug);
        string schemaName = $"tenant_{normalizedSlug.Replace('-', '_')}";

        await CreateSchemaIfNotExistsAsync(schemaName, cancellationToken);

        ICurrentTenant currentTenant = new ProvisioningCurrentTenant(normalizedSlug);
        await using TenantDbContext tenantDbContext = new(_postgresConnectionString, currentTenant);

        await tenantDbContext.Database.MigrateAsync(cancellationToken);
        await _tenantRlsPolicyManager.ApplyPoliciesAsync(tenantDbContext, cancellationToken);
        await SeedDefaultsAsync(tenantDbContext, cancellationToken);

        _logger.LogInformation("Provisioned tenant schema {SchemaName} for slug {TenantSlug}.", schemaName, normalizedSlug);
    }

    private async Task CreateSchemaIfNotExistsAsync(string schemaName, CancellationToken cancellationToken)
    {
        NpgsqlConnectionStringBuilder builder = new(_postgresConnectionString)
        {
            SearchPath = "public"
        };

        await using NpgsqlConnection connection = new(builder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        string sql = $"CREATE SCHEMA IF NOT EXISTS \"{schemaName}\";";
        await using NpgsqlCommand command = new(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static Task SeedDefaultsAsync(TenantDbContext dbContext, CancellationToken cancellationToken)
    {
        // Placeholder for tenant default data; keep explicit method so seeding
        // evolves without changing provisioning orchestration.
        return Task.CompletedTask;
    }

    private static string NormalizeSlug(string slug)
    {
        string normalized = Guard.NotEmpty(slug, nameof(slug)).Trim().ToLowerInvariant();
        if (normalized.Any(ch => !(char.IsAsciiLetterOrDigit(ch) || ch == '-')))
        {
            throw new ArgumentException("Slug must contain only lowercase letters, digits, and hyphens.", nameof(slug));
        }

        return normalized;
    }

    private sealed class ProvisioningCurrentTenant : ICurrentTenant
    {
        public ProvisioningCurrentTenant(string slug)
        {
            Slug = slug;
        }

        public string? TenantId => null;

        public string? Slug { get; }

        public TenantSettings? Settings => null;

        public bool IsResolved => !string.IsNullOrWhiteSpace(Slug);
    }
}
