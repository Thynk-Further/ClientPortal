namespace Infrastructure.Persistence.Security;

public interface ITenantRlsPolicyManager
{
    Task ApplyPoliciesAsync(TenantDbContext dbContext, CancellationToken cancellationToken = default);
}
