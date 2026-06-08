using Application.Projects.Abstractions;
using Application.Projects.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class ProjectTaskRepository : IProjectTaskRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public ProjectTaskRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<ProjectTask?> FindByIdAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<ProjectTask>()
            .SingleOrDefaultAsync(task => task.Id == taskId, cancellationToken);
    }

    public Task<IReadOnlyList<ProjectTask>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<ProjectTask>()
            .AsNoTracking()
            .Where(task => task.ProjectId == projectId)
            .OrderBy(task => task.DueDate)
            .ToListAsync(cancellationToken)
            .ContinueWith(
                task => (IReadOnlyList<ProjectTask>)task.Result,
                cancellationToken,
                TaskContinuationOptions.ExecuteSynchronously,
                TaskScheduler.Default);
    }

    public async Task<PagedResult<MyTaskListItemDto>> GetByAssigneePagedAsync(
        Guid assigneeId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        List<ProjectTask> tasks = await _tenantDbContext.Set<ProjectTask>()
            .AsNoTracking()
            .Where(task => task.AssigneeId == assigneeId && task.Status != ProjectTaskStatus.Done)
            .OrderBy(task => task.DueDate)
            .ToListAsync(cancellationToken);

        int totalCount = tasks.Count;
        List<ProjectTask> pageItems = tasks
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        Guid[] projectIds = pageItems.Select(task => task.ProjectId).Distinct().ToArray();
        Dictionary<Guid, Project> projects = await _tenantDbContext.Set<Project>()
            .AsNoTracking()
            .Where(project => projectIds.Contains(project.Id))
            .ToDictionaryAsync(project => project.Id, cancellationToken);

        Guid[] clientIds = projects.Values.Select(project => project.ClientId).Distinct().ToArray();
        Dictionary<Guid, string> clientNames = await _tenantDbContext.Set<Client>()
            .AsNoTracking()
            .Where(client => clientIds.Contains(client.Id))
            .ToDictionaryAsync(client => client.Id, client => client.CompanyName, cancellationToken);

        List<MyTaskListItemDto> items = pageItems
            .Select(task =>
            {
                projects.TryGetValue(task.ProjectId, out Project? project);
                string clientCompanyName = project is not null && clientNames.TryGetValue(project.ClientId, out string? name)
                    ? name
                    : string.Empty;

                return new MyTaskListItemDto(
                    task.Id,
                    task.ProjectId,
                    project?.Name ?? string.Empty,
                    project?.ClientId ?? Guid.Empty,
                    clientCompanyName,
                    task.Title,
                    task.Status,
                    task.Priority,
                    task.DueDate);
            })
            .ToList();

        return new PagedResult<MyTaskListItemDto>(items, totalCount, page, pageSize);
    }

    public void Add(ProjectTask task)
    {
        _tenantDbContext.Set<ProjectTask>().Add(task);
    }

    public void Update(ProjectTask task)
    {
        _tenantDbContext.Set<ProjectTask>().Update(task);
    }

    public void Remove(ProjectTask task)
    {
        _tenantDbContext.Set<ProjectTask>().Remove(task);
    }
}
