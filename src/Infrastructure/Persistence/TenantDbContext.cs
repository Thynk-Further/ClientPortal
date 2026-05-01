using Application.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Shared;
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
        modelBuilder.HasDefaultSchema(GetTenantSchema());
        ConfigureNotificationPreferences(modelBuilder);
        ApplySnakeCaseConventions(modelBuilder);
    }

    private static void ConfigureNotificationPreferences(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserNotificationPreferences>(entity =>
        {
            entity.HasKey(preferences => preferences.Id);
            entity.HasIndex(preferences => preferences.UserId).IsUnique();
        });
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

    private static void ApplySnakeCaseConventions(ModelBuilder modelBuilder)
    {
        foreach (IMutableEntityType entity in modelBuilder.Model.GetEntityTypes())
        {
            if (entity.IsOwned())
            {
                continue;
            }

            string tableName = entity.GetTableName() ?? entity.DisplayName();
            entity.SetTableName(ToSnakeCase(tableName));

            foreach (IMutableProperty property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }

            foreach (IMutableKey key in entity.GetKeys())
            {
                key.SetName(ToSnakeCase(key.GetName() ?? string.Empty));
            }

            foreach (IMutableForeignKey foreignKey in entity.GetForeignKeys())
            {
                foreignKey.SetConstraintName(ToSnakeCase(foreignKey.GetConstraintName() ?? string.Empty));
            }

            foreach (IMutableIndex index in entity.GetIndexes())
            {
                index.SetDatabaseName(ToSnakeCase(index.GetDatabaseName() ?? string.Empty));
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
