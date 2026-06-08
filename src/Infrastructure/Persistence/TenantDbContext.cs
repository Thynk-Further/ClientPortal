using Application.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Shared;
using System.Linq;
using System.Text;

namespace Infrastructure.Persistence;

public sealed class TenantDbContext : DbContext
{
    private readonly string _postgresConnectionString;
    private readonly ICurrentTenant _currentTenant;
    private string? _tenantSchema;

    public TenantDbContext(
        string postgresConnectionString,
        ICurrentTenant currentTenant)
    {
        _currentTenant = currentTenant;
        _postgresConnectionString = Guard.NotEmpty(postgresConnectionString, nameof(postgresConnectionString));
    }

    public TenantDbContext(
        IConfiguration configuration,
        ICurrentTenant currentTenant)
    {
        _currentTenant = currentTenant;
        _postgresConnectionString = Guard.NotEmpty(
            configuration.GetConnectionString("Postgres"),
            "ConnectionStrings:Postgres");
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        string schema = GetTenantSchema();

        NpgsqlConnectionStringBuilder connectionStringBuilder = new(_postgresConnectionString)
        {
            SearchPath = schema
        };

        optionsBuilder.UseNpgsql(connectionStringBuilder.ConnectionString);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Do not call HasDefaultSchema with the tenant slug: migration snapshots would bake in
        // design-time schema (e.g. tenant_design_time) while runtime uses tenant_{slug}, which
        // triggers PendingModelChangesWarning on MigrateAsync. PostgreSQL resolves unqualified
        // identifiers via connection SearchPath (set per tenant in OnConfiguring).
        // All tenant tables: add IEntityTypeConfiguration<T> under Persistence/Configurations, then add an EF migration.
        modelBuilder.ApplyTenantEntityConfigurations();
        ApplySnakeCaseConventions(modelBuilder);
    }

    private string GetTenantSchema()
    {
        if (!string.IsNullOrWhiteSpace(_tenantSchema))
        {
            return _tenantSchema;
        }

        string tenantSlug = Guard.NotEmpty(_currentTenant.Slug, nameof(_currentTenant.Slug));
        _tenantSchema = $"tenant_{NormalizeSlug(tenantSlug)}";
        return _tenantSchema;
    }

    /// <summary>
    /// Snake_case naming with deterministic ordering; skips unset EF identifiers so we never persist
    /// empty constraint names (that can make the model appear to change between builds).
    /// </summary>
    private static void ApplySnakeCaseConventions(ModelBuilder modelBuilder)
    {
        List<IMutableEntityType> entityTypes = modelBuilder.Model.GetEntityTypes()
            .Where(static entity => !entity.IsOwned())
            .OrderBy(static entity => entity.Name, StringComparer.Ordinal)
            .ToList();

        foreach (IMutableEntityType entity in entityTypes)
        {
            string tableName = entity.GetTableName() ?? entity.DisplayName();
            entity.SetTableName(ToSnakeCase(tableName));

            foreach (IMutableProperty property in entity.GetProperties())
            {
                if (property.Name.StartsWith("_", StringComparison.Ordinal))
                {
                    continue;
                }

                property.SetColumnName(ToSnakeCase(property.Name));
            }

            foreach (IMutableKey key in entity.GetKeys())
            {
                string? keyName = key.GetName();
                if (!string.IsNullOrEmpty(keyName))
                {
                    key.SetName(ToSnakeCase(keyName));
                }
            }

            foreach (IMutableForeignKey foreignKey in entity.GetForeignKeys())
            {
                string? constraintName = foreignKey.GetConstraintName();
                if (!string.IsNullOrEmpty(constraintName))
                {
                    foreignKey.SetConstraintName(ToSnakeCase(constraintName));
                }
            }

            foreach (IMutableIndex index in entity.GetIndexes())
            {
                string? databaseName = index.GetDatabaseName();
                if (!string.IsNullOrEmpty(databaseName))
                {
                    index.SetDatabaseName(ToSnakeCase(databaseName));
                }
            }
        }
    }

    private static string ToSnakeCase(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return value;
        }

        StringBuilder builder = new(value.Length + 8);

        for (int i = 0; i < value.Length; i++)
        {
            char current = value[i];
            bool currentIsUpper = char.IsUpper(current);
            bool previousIsLowerOrDigit = i > 0 && (char.IsLower(value[i - 1]) || char.IsDigit(value[i - 1]));
            bool previousIsUpper = i > 0 && char.IsUpper(value[i - 1]);
            bool nextIsLower = i + 1 < value.Length && char.IsLower(value[i + 1]);

            if (builder.Length > 0 && currentIsUpper && (previousIsLowerOrDigit || (previousIsUpper && nextIsLower)))
            {
                builder.Append('_');
            }

            builder.Append(char.ToLowerInvariant(current));
        }

        return builder.ToString();
    }

    private static string NormalizeSlug(string slug)
    {
        string normalized = slug.Trim().ToLowerInvariant();
        if (normalized.Length == 0)
        {
            throw new ArgumentException("Tenant slug cannot be empty.", nameof(slug));
        }

        if (normalized.Any(ch => !(char.IsAsciiLetterOrDigit(ch) || ch == '-')))
        {
            throw new ArgumentException(
                "Tenant slug must contain only lowercase letters, digits, and hyphens.",
                nameof(slug));
        }

        return normalized.Replace('-', '_');
    }
}
