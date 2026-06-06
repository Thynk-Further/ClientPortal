using Application.Clients.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class ClientUserAccountRepository : IClientUserAccountRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public ClientUserAccountRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<bool> ExistsByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<User>()
            .AsNoTracking()
            .AnyAsync(user => user.Email == email, cancellationToken);
    }

    public Task<User?> FindByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<User>()
            .SingleOrDefaultAsync(user => user.Email == email, cancellationToken);
    }

    public Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<User>()
            .SingleOrDefaultAsync(user => user.Id == userId, cancellationToken);
    }

    public void Add(User user)
    {
        _tenantDbContext.Set<User>().Add(user);
    }

    public void Update(User user)
    {
        _tenantDbContext.Set<User>().Update(user);
    }
}
