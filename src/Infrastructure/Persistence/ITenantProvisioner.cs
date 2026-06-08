namespace Infrastructure.Persistence;

public interface ITenantProvisioner
{
    /// <summary>
    /// Ensures the tenant PostgreSQL schema exists and applies every pending
    /// <see cref="TenantDbContext"/> EF Core migration (all tenant tables registered on that context).
    /// Idempotent: safe to call on startup for existing tenants when new migrations are added.
    /// </summary>
    Task CreateSchemaAsync(string slug, CancellationToken cancellationToken = default);

    /// <summary>
    /// Drops the tenant-specific PostgreSQL schema (if present). Used to compensate failed registration.
    /// </summary>
    Task DropTenantSchemaAsync(string slug, CancellationToken cancellationToken = default);
}
