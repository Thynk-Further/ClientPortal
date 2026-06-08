using Application.Abstractions;
using Application.Auth.Abstractions;
using Domain;
using Infrastructure.Persistence.Public;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Persistence;

public sealed class UserAuthenticationRepository : IUserAuthenticationRepository
{
    private readonly PublicDbContext _publicDbContext;
    private readonly string _postgresConnectionString;
    private readonly ICurrentTenant _currentTenant;

    public UserAuthenticationRepository(
        PublicDbContext publicDbContext,
        IConfiguration configuration,
        ICurrentTenant currentTenant)
    {
        _publicDbContext = publicDbContext;
        _currentTenant = currentTenant;
        _postgresConnectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres must be configured.");
    }

    public async Task<User?> FindByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default)
    {
        TenantResolutionContext.Clear();
        string emailValue = email.Value;

        if (_currentTenant.IsResolved && !string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            string resolvedSlug = _currentTenant.Slug!;
            User? user = await FindUserByEmailInTenantAsync(resolvedSlug, emailValue, cancellationToken);
            if (user is not null)
            {
                TenantResolutionContext.SetSlug(resolvedSlug);
            }

            return user;
        }

        return await FindUserByEmailAcrossTenantsAsync(emailValue, cancellationToken);
    }

    public Task<User?> FindByRefreshTokenHashAsync(string refreshTokenHash, CancellationToken cancellationToken = default)
    {
        TenantResolutionContext.Clear();
        _ = refreshTokenHash;
        _ = cancellationToken;
        return Task.FromResult<User?>(null);
    }

    public async Task<User?> FindByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        TenantResolutionContext.Clear();

        if (_currentTenant.IsResolved && !string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            string resolvedSlug = _currentTenant.Slug!;
            User? user = await FindUserByIdInTenantAsync(resolvedSlug, userId, cancellationToken);
            if (user is not null)
            {
                TenantResolutionContext.SetSlug(resolvedSlug);
            }

            return user;
        }

        return await FindUserByIdAcrossTenantsAsync(userId, cancellationToken);
    }

    public void Update(User user)
    {
        string? slug = TenantResolutionContext.Slug;
        if (string.IsNullOrWhiteSpace(slug))
        {
            slug = _currentTenant.Slug;
        }

        if (string.IsNullOrWhiteSpace(slug))
        {
            throw new InvalidOperationException("Cannot update user without a resolved tenant slug.");
        }

        using TenantDbContext dbContext = CreateDb(slug);
        dbContext.Update(user);
        dbContext.SaveChanges();
    }

    private Task<List<string>> ActiveTenantSlugsAsync(CancellationToken cancellationToken)
    {
        return _publicDbContext.Tenants
            .AsNoTracking()
            .Where(tenant => tenant.IsActive)
            .OrderBy(tenant => tenant.Slug)
            .Select(tenant => tenant.Slug)
            .ToListAsync(cancellationToken);
    }

    private async Task<User?> FindUserByEmailAcrossTenantsAsync(
        string email,
        CancellationToken cancellationToken)
    {
        List<string> slugs = await ActiveTenantSlugsAsync(cancellationToken);
        User? inactiveMatch = null;
        string? inactiveMatchSlug = null;

        foreach (string slug in slugs)
        {
            User? user = await FindUserByEmailInTenantAsync(slug, email, cancellationToken);
            if (user is null)
            {
                continue;
            }

            if (user.IsActive)
            {
                TenantResolutionContext.SetSlug(slug);
                return user;
            }

            inactiveMatch ??= user;
            inactiveMatchSlug ??= slug;
        }

        if (inactiveMatch is not null && inactiveMatchSlug is not null)
        {
            TenantResolutionContext.SetSlug(inactiveMatchSlug);
        }

        return inactiveMatch;
    }

    private async Task<User?> FindUserByIdAcrossTenantsAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        List<string> slugs = await ActiveTenantSlugsAsync(cancellationToken);
        User? inactiveMatch = null;
        string? inactiveMatchSlug = null;

        foreach (string slug in slugs)
        {
            User? user = await FindUserByIdInTenantAsync(slug, userId, cancellationToken);
            if (user is null)
            {
                continue;
            }

            if (user.IsActive)
            {
                TenantResolutionContext.SetSlug(slug);
                return user;
            }

            inactiveMatch ??= user;
            inactiveMatchSlug ??= slug;
        }

        if (inactiveMatch is not null && inactiveMatchSlug is not null)
        {
            TenantResolutionContext.SetSlug(inactiveMatchSlug);
        }

        return inactiveMatch;
    }

    private async Task<User?> FindUserByEmailInTenantAsync(
        string slug,
        string email,
        CancellationToken cancellationToken)
    {
        await using TenantDbContext dbContext = CreateDb(slug);
        EmailAddress targetEmail = new(email);
        return await dbContext.Set<User>()
            .AsNoTracking()
            .SingleOrDefaultAsync(u => u.Email == targetEmail, cancellationToken);
    }

    private async Task<User?> FindUserByIdInTenantAsync(
        string slug,
        Guid userId,
        CancellationToken cancellationToken)
    {
        await using TenantDbContext dbContext = CreateDb(slug);
        return await dbContext.Set<User>()
            .SingleOrDefaultAsync(u => u.Id == userId, cancellationToken);
    }

    private TenantDbContext CreateDb(string slug)
    {
        return new TenantDbContext(_postgresConnectionString, new SlugCurrentTenant(slug));
    }
}
