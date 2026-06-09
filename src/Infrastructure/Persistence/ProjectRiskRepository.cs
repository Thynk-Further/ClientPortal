using Application.Projects.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class ProjectRiskRepository : IProjectRiskRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public ProjectRiskRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<ProjectRisk?> FindByIdAsync(Guid riskId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<ProjectRisk>()
            .SingleOrDefaultAsync(risk => risk.Id == riskId, cancellationToken);
    }

    public Task<IReadOnlyList<ProjectRisk>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<ProjectRisk>()
            .AsNoTracking()
            .Where(risk => risk.ProjectId == projectId)
            .OrderByDescending(risk => risk.CreatedAt)
            .ToListAsync(cancellationToken)
            .ContinueWith(
                task => (IReadOnlyList<ProjectRisk>)task.Result,
                cancellationToken,
                TaskContinuationOptions.ExecuteSynchronously,
                TaskScheduler.Default);
    }

    public void Add(ProjectRisk risk)
    {
        _tenantDbContext.Set<ProjectRisk>().Add(risk);
    }

    public void Update(ProjectRisk risk)
    {
        _tenantDbContext.Set<ProjectRisk>().Update(risk);
    }

    public void Remove(ProjectRisk risk)
    {
        _tenantDbContext.Set<ProjectRisk>().Remove(risk);
    }
}
