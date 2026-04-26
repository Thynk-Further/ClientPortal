using Infrastructure;
using Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace Infrastructure.IntegrationTests;

public sealed class TenantProvisionerIntegrationTests
{
    private const string TestConnectionStringEnvironmentVariable = "CLIENTPORTAL_TEST_POSTGRES";

    [Fact]
    public async Task CreateSchemaAsync_ShouldCreateSchema_ApplyMigrations_AndSupportWriteRead()
    {
        string? postgresConnectionString = Environment.GetEnvironmentVariable(TestConnectionStringEnvironmentVariable);
        if (string.IsNullOrWhiteSpace(postgresConnectionString))
        {
            return;
        }

        string slug = $"it-{Guid.NewGuid():N}"[..18];
        string schemaName = $"tenant_{slug.Replace('-', '_')}";

        ServiceCollection services = new();
        ConfigurationManager configuration = new();
        configuration["ConnectionStrings:Postgres"] = postgresConnectionString;

        services.AddLogging();
        services.AddInfrastructure(configuration);

        await using ServiceProvider serviceProvider = services.BuildServiceProvider();
        await using AsyncServiceScope scope = serviceProvider.CreateAsyncScope();

        ITenantProvisioner provisioner = scope.ServiceProvider.GetRequiredService<ITenantProvisioner>();

        try
        {
            await provisioner.CreateSchemaAsync(slug);

            await using NpgsqlConnection connection = new(postgresConnectionString);
            await connection.OpenAsync();

            Assert.True(await SchemaExistsAsync(connection, schemaName));
            Assert.True(await TableExistsAsync(connection, schemaName, "__EFMigrationsHistory"));

            await using NpgsqlCommand createProbe = new(
                $"""
                 CREATE TABLE IF NOT EXISTS "{schemaName}"."integration_probe"
                 (
                    id uuid PRIMARY KEY,
                    value text NOT NULL
                 );
                 """,
                connection);
            await createProbe.ExecuteNonQueryAsync();

            Guid probeId = Guid.NewGuid();
            const string probeValue = "tenant-provisioning-ok";

            await using NpgsqlCommand insertProbe = new(
                $"""INSERT INTO "{schemaName}"."integration_probe" (id, value) VALUES (@id, @value);""",
                connection);
            insertProbe.Parameters.AddWithValue("id", probeId);
            insertProbe.Parameters.AddWithValue("value", probeValue);
            await insertProbe.ExecuteNonQueryAsync();

            await using NpgsqlCommand readProbe = new(
                $"""SELECT value FROM "{schemaName}"."integration_probe" WHERE id = @id;""",
                connection);
            readProbe.Parameters.AddWithValue("id", probeId);

            object? readValue = await readProbe.ExecuteScalarAsync();
            Assert.Equal(probeValue, readValue as string);
        }
        finally
        {
            await using NpgsqlConnection cleanupConnection = new(postgresConnectionString);
            await cleanupConnection.OpenAsync();
            await using NpgsqlCommand cleanupCommand = new($"""DROP SCHEMA IF EXISTS "{schemaName}" CASCADE;""", cleanupConnection);
            await cleanupCommand.ExecuteNonQueryAsync();
        }
    }

    private static async Task<bool> SchemaExistsAsync(NpgsqlConnection connection, string schemaName)
    {
        await using NpgsqlCommand command = new(
            """
            SELECT EXISTS(
                SELECT 1
                FROM information_schema.schemata
                WHERE schema_name = @schemaName
            );
            """,
            connection);
        command.Parameters.AddWithValue("schemaName", schemaName);
        return (bool)(await command.ExecuteScalarAsync() ?? false);
    }

    private static async Task<bool> TableExistsAsync(NpgsqlConnection connection, string schemaName, string tableName)
    {
        await using NpgsqlCommand command = new(
            """
            SELECT EXISTS(
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = @schemaName
                  AND table_name = @tableName
            );
            """,
            connection);
        command.Parameters.AddWithValue("schemaName", schemaName);
        command.Parameters.AddWithValue("tableName", tableName);
        return (bool)(await command.ExecuteScalarAsync() ?? false);
    }
}
