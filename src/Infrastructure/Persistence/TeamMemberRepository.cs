using Application.Team.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class TeamMemberRepository : ITeamMemberRepository
{
    private static readonly Role[] StaffRoles = [Role.Owner, Role.Admin, Role.Staff];

    private readonly TenantDbContext _tenantDbContext;

    public TeamMemberRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<IReadOnlyList<User>> ListStaffAsync(CancellationToken cancellationToken = default)
    {
        return await _tenantDbContext.Set<User>()
            .AsNoTracking()
            .Where(user => StaffRoles.Contains(user.Role))
            .OrderBy(user => user.FullName)
            .ToListAsync(cancellationToken);
    }

    public Task<int> CountActiveStaffAsync(CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<User>()
            .AsNoTracking()
            .CountAsync(user => user.IsActive && StaffRoles.Contains(user.Role), cancellationToken);
    }

    public Task<int> CountActiveOwnersAsync(CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<User>()
            .AsNoTracking()
            .CountAsync(user => user.IsActive && user.Role == Role.Owner, cancellationToken);
    }

    public Task<User?> FindStaffByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<User>()
            .SingleOrDefaultAsync(user => user.Id == userId && StaffRoles.Contains(user.Role), cancellationToken);
    }

    public Task<bool> ExistsByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<User>()
            .AsNoTracking()
            .AnyAsync(user => user.Email == email, cancellationToken);
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
