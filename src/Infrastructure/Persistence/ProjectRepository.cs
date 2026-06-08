using Application.Projects;
using Application.Projects.Abstractions;
using Application.Projects.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class ProjectRepository : IProjectRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public ProjectRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<Project?> FindByIdAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<Project>()
            .SingleOrDefaultAsync(project => project.Id == projectId, cancellationToken);
    }

    public async Task<ProjectDashboardDto?> GetDashboardAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        Project? project = await _tenantDbContext.Set<Project>()
            .AsNoTracking()
            .SingleOrDefaultAsync(entity => entity.Id == projectId, cancellationToken);

        if (project is null)
        {
            return null;
        }

        Client? client = await _tenantDbContext.Set<Client>()
            .AsNoTracking()
            .SingleOrDefaultAsync(entity => entity.Id == project.ClientId, cancellationToken);

        string clientCompanyName = client?.CompanyName ?? string.Empty;

        List<Milestone> milestones = await _tenantDbContext.Set<Milestone>()
            .AsNoTracking()
            .Where(milestone => milestone.ProjectId == projectId)
            .OrderBy(milestone => milestone.DueDate)
            .ToListAsync(cancellationToken);

        List<ProjectTask> tasks = await _tenantDbContext.Set<ProjectTask>()
            .AsNoTracking()
            .Where(task => task.ProjectId == projectId)
            .OrderBy(task => task.DueDate)
            .ToListAsync(cancellationToken);

        List<ClientRequest> requests = await _tenantDbContext.Set<ClientRequest>()
            .AsNoTracking()
            .Where(request => request.ProjectId == projectId)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync(cancellationToken);

        List<ProjectRisk> risks = await _tenantDbContext.Set<ProjectRisk>()
            .AsNoTracking()
            .Where(risk => risk.ProjectId == projectId)
            .OrderByDescending(risk => risk.CreatedAt)
            .ToListAsync(cancellationToken);

        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        ProjectTaskSummaryDto taskSummary = BuildTaskSummary(tasks);
        int overdueMilestoneCount = milestones.Count(milestone =>
            milestone.Status != MilestoneStatus.Completed && milestone.DueDate < today);
        int openRiskCount = risks.Count(risk => risk.Status == ProjectRiskStatus.Open);

        ProjectHealth health = ProjectHealthCalculator.Calculate(
            milestones,
            tasks,
            risks,
            today);

        IReadOnlyList<ProjectDashboardActivityDto> recentActivity = BuildRecentActivity(
            milestones,
            tasks,
            requests);

        return new ProjectDashboardDto(
            ProjectId: project.Id,
            ClientId: project.ClientId,
            ClientCompanyName: clientCompanyName,
            Name: project.Name,
            Description: project.Description,
            Status: project.Status,
            StartDate: project.StartDate,
            EndDate: project.EndDate,
            Budget: project.Budget,
            Currency: project.Currency,
            Health: health,
            OpenRiskCount: openRiskCount,
            OverdueMilestoneCount: overdueMilestoneCount,
            TaskSummary: taskSummary,
            Milestones: milestones
                .Select(milestone => new ProjectDashboardMilestoneDto(
                    milestone.Id,
                    milestone.Name,
                    milestone.DueDate,
                    milestone.Status,
                    milestone.CompletedAt))
                .ToList(),
            Tasks: tasks
                .Select(task => new ProjectDashboardTaskDto(
                    task.Id,
                    task.MilestoneId,
                    task.Title,
                    task.AssigneeId,
                    task.Status,
                    task.Priority,
                    task.DueDate))
                .ToList(),
            Requests: requests
                .Select(request => new ProjectDashboardRequestDto(
                    request.Id,
                    request.ClientId,
                    request.Title,
                    request.Description,
                    request.Status,
                    request.Priority))
                .ToList(),
            Risks: risks
                .Select(risk => new ProjectDashboardRiskDto(
                    risk.Id,
                    risk.Title,
                    risk.Description,
                    risk.Severity,
                    risk.Status,
                    risk.OwnerId,
                    risk.DueDate))
                .ToList(),
            RecentActivity: recentActivity);
    }

    public async Task<PagedResult<ProjectListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        ProjectStatus? status,
        Guid? clientId,
        string? search,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Project> query = _tenantDbContext.Set<Project>().AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(project => project.Status == status.Value);
        }

        if (clientId.HasValue)
        {
            query = query.Where(project => project.ClientId == clientId.Value);
        }

        List<Project> projects = await query.ToListAsync(cancellationToken);
        Dictionary<Guid, string> clientNames = await LoadClientNamesAsync(projects, cancellationToken);

        string? normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        if (normalizedSearch is not null)
        {
            projects = projects
                .Where(project =>
                    project.Name.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase)
                    || (clientNames.TryGetValue(project.ClientId, out string? clientName)
                        && clientName.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase)))
                .ToList();
        }

        int totalCount = projects.Count;
        List<ProjectListItemDto> items = [];

        foreach (Project project in projects
                     .OrderByDescending(entity => entity.CreatedAt)
                     .Skip((page - 1) * pageSize)
                     .Take(pageSize))
        {
            clientNames.TryGetValue(project.ClientId, out string? companyName);
            ProjectHealth health = await ComputeListHealthAsync(project.Id, cancellationToken);

            items.Add(new ProjectListItemDto(
                project.Id,
                project.ClientId,
                companyName ?? string.Empty,
                project.Name,
                project.Status,
                project.StartDate,
                project.EndDate,
                project.Budget,
                project.Currency,
                health));
        }

        return new PagedResult<ProjectListItemDto>(items, totalCount, page, pageSize);
    }

    public void Add(Project project)
    {
        _tenantDbContext.Set<Project>().Add(project);
    }

    public void Update(Project project)
    {
        _tenantDbContext.Set<Project>().Update(project);
    }

    private async Task<Dictionary<Guid, string>> LoadClientNamesAsync(
        IReadOnlyCollection<Project> projects,
        CancellationToken cancellationToken)
    {
        Guid[] clientIds = projects.Select(project => project.ClientId).Distinct().ToArray();
        if (clientIds.Length == 0)
        {
            return [];
        }

        List<Client> clients = await _tenantDbContext.Set<Client>()
            .AsNoTracking()
            .Where(client => clientIds.Contains(client.Id))
            .ToListAsync(cancellationToken);

        return clients.ToDictionary(client => client.Id, client => client.CompanyName);
    }

    private async Task<ProjectHealth> ComputeListHealthAsync(Guid projectId, CancellationToken cancellationToken)
    {
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);

        List<Milestone> milestones = await _tenantDbContext.Set<Milestone>()
            .AsNoTracking()
            .Where(milestone => milestone.ProjectId == projectId)
            .ToListAsync(cancellationToken);

        List<ProjectTask> tasks = await _tenantDbContext.Set<ProjectTask>()
            .AsNoTracking()
            .Where(task => task.ProjectId == projectId)
            .ToListAsync(cancellationToken);

        List<ProjectRisk> risks = await _tenantDbContext.Set<ProjectRisk>()
            .AsNoTracking()
            .Where(risk => risk.ProjectId == projectId)
            .ToListAsync(cancellationToken);

        return ProjectHealthCalculator.Calculate(milestones, tasks, risks, today);
    }

    private static ProjectTaskSummaryDto BuildTaskSummary(IReadOnlyCollection<ProjectTask> tasks)
    {
        return new ProjectTaskSummaryDto(
            Total: tasks.Count,
            Todo: tasks.Count(task => task.Status == ProjectTaskStatus.Todo),
            InProgress: tasks.Count(task => task.Status == ProjectTaskStatus.InProgress),
            Blocked: tasks.Count(task => task.Status == ProjectTaskStatus.Blocked),
            Done: tasks.Count(task => task.Status == ProjectTaskStatus.Done));
    }

    private static IReadOnlyList<ProjectDashboardActivityDto> BuildRecentActivity(
        IReadOnlyCollection<Milestone> milestones,
        IReadOnlyCollection<ProjectTask> tasks,
        IReadOnlyCollection<ClientRequest> requests)
    {
        List<ProjectDashboardActivityDto> activity = [];

        foreach (Milestone milestone in milestones.Where(entity => entity.CompletedAt.HasValue))
        {
            activity.Add(new ProjectDashboardActivityDto(
                milestone.CompletedAt!.Value,
                "MilestoneCompleted",
                $"Milestone completed: {milestone.Name}"));
        }

        foreach (ProjectTask task in tasks.OrderByDescending(entity => entity.UpdatedAt).Take(5))
        {
            activity.Add(new ProjectDashboardActivityDto(
                task.UpdatedAt,
                "TaskUpdated",
                $"Task updated: {task.Title} ({task.Status})"));
        }

        foreach (ClientRequest request in requests.Take(5))
        {
            activity.Add(new ProjectDashboardActivityDto(
                request.CreatedAt,
                "ClientRequestSubmitted",
                $"Client request: {request.Title}"));
        }

        return activity
            .OrderByDescending(item => item.OccurredAtUtc)
            .Take(20)
            .ToList();
    }
}
