using Application.Projects.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class MilestoneRepository : IMilestoneRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public MilestoneRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<Milestone?> FindByIdAsync(Guid milestoneId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<Milestone>()
            .SingleOrDefaultAsync(milestone => milestone.Id == milestoneId, cancellationToken);
    }

    public async Task<bool> ExistsIncompleteByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return await _tenantDbContext.Set<Milestone>()
            .AsNoTracking()
            .AnyAsync(
                milestone => milestone.ProjectId == projectId && milestone.Status != MilestoneStatus.Completed,
                cancellationToken);
    }

    public Task<IReadOnlyList<Milestone>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<Milestone>()
            .AsNoTracking()
            .Where(milestone => milestone.ProjectId == projectId)
            .OrderBy(milestone => milestone.DueDate)
            .ToListAsync(cancellationToken)
            .ContinueWith(
                task => (IReadOnlyList<Milestone>)task.Result,
                cancellationToken,
                TaskContinuationOptions.ExecuteSynchronously,
                TaskScheduler.Default);
    }

    public void Add(Milestone milestone)
    {
        _tenantDbContext.Set<Milestone>().Add(milestone);
    }

    public void Update(Milestone milestone)
    {
        _tenantDbContext.Set<Milestone>().Update(milestone);
    }

    public void Remove(Milestone milestone)
    {
        _tenantDbContext.Set<Milestone>().Remove(milestone);
    }
}
