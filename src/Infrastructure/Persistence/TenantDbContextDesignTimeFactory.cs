using Application.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore.Design;
using Npgsql;

namespace Infrastructure.Persistence;

public sealed class TenantDbContextDesignTimeFactory : IDesignTimeDbContextFactory<TenantDbContext>
{
    private const string DesignTimeTenantSlug = "design-time";
    private const string FallbackConnectionString =
        "Host=localhost;Port=5433;Database=clientportal;Username=postgres;Password=postgres";

    public TenantDbContext CreateDbContext(string[] args)
    {
        string connectionString = ResolveConnectionString(args);
        ICurrentTenant currentTenant = new DesignTimeCurrentTenant();
        string schemaName = TenantSchemaNames.FromSlug(DesignTimeTenantSlug);

        TenantSchemaBootstrapper.EnsureSchemaExists(connectionString, schemaName);

        return new TenantDbContext(connectionString, currentTenant);
    }

    private static string ResolveConnectionString(string[] args)
    {
        for (int index = 0; index < args.Length - 1; index++)
        {
            if (string.Equals(args[index], "--connection", StringComparison.OrdinalIgnoreCase)
                || string.Equals(args[index], "-c", StringComparison.OrdinalIgnoreCase))
            {
                string value = args[index + 1];
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }
        }

        string? environmentConnection = Environment.GetEnvironmentVariable("POSTGRES_CONNECTION");
        if (!string.IsNullOrWhiteSpace(environmentConnection))
        {
            return environmentConnection;
        }

        return FallbackConnectionString;
    }

    private sealed class DesignTimeCurrentTenant : ICurrentTenant
    {
        public string? TenantId => "00000000-0000-0000-0000-000000000000";

        public string? Slug => DesignTimeTenantSlug;

        public TenantSettings? Settings => TenantSettings.Default();

        public bool IsResolved => true;
    }
}

internal static class TenantSchemaNames
{
    internal static string FromSlug(string slug)
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

        return $"tenant_{normalized.Replace('-', '_')}";
    }
}

internal static class TenantSchemaBootstrapper
{
    internal static void EnsureSchemaExists(string postgresConnectionString, string schemaName)
    {
        NpgsqlConnectionStringBuilder builder = new(postgresConnectionString)
        {
            SearchPath = "public",
        };

        using NpgsqlConnection connection = new(builder.ConnectionString);
        connection.Open();

        using NpgsqlCommand command = new($"CREATE SCHEMA IF NOT EXISTS \"{schemaName}\";", connection);
        command.ExecuteNonQuery();
    }
}
