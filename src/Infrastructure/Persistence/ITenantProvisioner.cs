namespace Infrastructure.Persistence;

public interface ITenantProvisioner
{
    Task CreateSchemaAsync(string slug, CancellationToken cancellationToken = default);
}
