using Application.Clients.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class OnboardingChecklistRepository : IOnboardingChecklistRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public OnboardingChecklistRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<OnboardingChecklist?> FindByClientIdAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<OnboardingChecklist>()
            .SingleOrDefaultAsync(checklist => checklist.ClientId == clientId, cancellationToken);
    }

    public void Add(OnboardingChecklist checklist)
    {
        _tenantDbContext.Set<OnboardingChecklist>().Add(checklist);
    }

    public void Update(OnboardingChecklist checklist)
    {
        _tenantDbContext.Set<OnboardingChecklist>().Update(checklist);
    }
}
