using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientPortalProjectsReader : IClientPortalProjectsReader
{
    private const int RecentActivityPerProjectLimit = 5;

    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientPortalProjectsReader(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<ClientPortalProjectsResultDto> GetProjectsAsync(
        Guid clientId,
        CancellationToken cancellationToken = default)
    {
        List<Project> projects = await _tenantDbContext.Set<Project>()
            .AsNoTracking()
            .Where(project => project.ClientId == clientId)
            .OrderByDescending(project => project.UpdatedAt)
            .ToListAsync(cancellationToken);

        if (projects.Count == 0)
        {
            return new ClientPortalProjectsResultDto([]);
        }

        Guid[] projectIds = projects.Select(project => project.Id).ToArray();

        List<Milestone> milestones = await _tenantDbContext.Set<Milestone>()
            .AsNoTracking()
            .Where(milestone => projectIds.Contains(milestone.ProjectId))
            .ToListAsync(cancellationToken);

        List<ProjectTask> tasks = await _tenantDbContext.Set<ProjectTask>()
            .AsNoTracking()
            .Where(task => projectIds.Contains(task.ProjectId))
            .ToListAsync(cancellationToken);

        List<ClientRequest> requests = await _tenantDbContext.Set<ClientRequest>()
            .AsNoTracking()
            .Where(request => projectIds.Contains(request.ProjectId))
            .ToListAsync(cancellationToken);

        IReadOnlyList<ClientPortalProjectListItemDto> items = projects
            .Select(project =>
            {
                List<Milestone> projectMilestones = milestones
                    .Where(milestone => milestone.ProjectId == project.Id)
                    .ToList();
                List<ProjectTask> projectTasks = tasks
                    .Where(task => task.ProjectId == project.Id)
                    .ToList();
                List<ClientRequest> projectRequests = requests
                    .Where(request => request.ProjectId == project.Id)
                    .ToList();

                return new ClientPortalProjectListItemDto(
                    project.Id,
                    project.Name,
                    project.Status,
                    project.StartDate,
                    project.EndDate,
                    BuildMilestoneProgress(projectMilestones),
                    BuildRecentActivity(projectMilestones, projectTasks, projectRequests));
            })
            .ToList();

        return new ClientPortalProjectsResultDto(items);
    }

    private static ClientPortalMilestoneProgressDto BuildMilestoneProgress(
        IReadOnlyCollection<Milestone> milestones)
    {
        int totalCount = milestones.Count;
        int completedCount = milestones.Count(milestone => milestone.Status == MilestoneStatus.Completed);
        int progressPercent = totalCount == 0
            ? 0
            : (int)Math.Round((double)completedCount / totalCount * 100, MidpointRounding.AwayFromZero);

        return new ClientPortalMilestoneProgressDto(totalCount, completedCount, progressPercent);
    }

    private static IReadOnlyList<ClientPortalProjectActivityDto> BuildRecentActivity(
        IReadOnlyCollection<Milestone> milestones,
        IReadOnlyCollection<ProjectTask> tasks,
        IReadOnlyCollection<ClientRequest> requests)
    {
        List<ClientPortalProjectActivityDto> activity = [];

        foreach (Milestone milestone in milestones.Where(entity => entity.CompletedAt.HasValue))
        {
            activity.Add(new ClientPortalProjectActivityDto(
                milestone.CompletedAt!.Value,
                "MilestoneCompleted",
                $"Milestone completed: {milestone.Name}"));
        }

        foreach (ProjectTask task in tasks.OrderByDescending(entity => entity.UpdatedAt).Take(5))
        {
            activity.Add(new ClientPortalProjectActivityDto(
                task.UpdatedAt,
                "TaskUpdated",
                $"Task updated: {task.Title} ({task.Status})"));
        }

        foreach (ClientRequest request in requests.OrderByDescending(entity => entity.CreatedAt).Take(5))
        {
            activity.Add(new ClientPortalProjectActivityDto(
                request.CreatedAt,
                "ClientRequestSubmitted",
                $"Request submitted: {request.Title}"));
        }

        return activity
            .OrderByDescending(item => item.OccurredAtUtc)
            .Take(RecentActivityPerProjectLimit)
            .ToList();
    }
}
