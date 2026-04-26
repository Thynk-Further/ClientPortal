namespace Infrastructure.Persistence;

public interface ITenantDbContextFactory
{
    TenantDbContext Create();
}
