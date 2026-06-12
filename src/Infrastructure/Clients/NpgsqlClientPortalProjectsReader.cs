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

    public async Task<ClientPortalProjectDetailDto?> GetProjectDetailAsync(
        Guid clientId,
        Guid projectId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        Project? project = await _tenantDbContext.Set<Project>()
            .AsNoTracking()
            .SingleOrDefaultAsync(
                entity => entity.Id == projectId && entity.ClientId == clientId,
                cancellationToken);

        if (project is null)
        {
            return null;
        }

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

        List<Contract> contracts = await _tenantDbContext.Set<Contract>()
            .AsNoTracking()
            .Where(contract => contract.ClientId == clientId)
            .OrderByDescending(contract => contract.UpdatedAt)
            .Take(20)
            .ToListAsync(cancellationToken);

        List<MessageThread> threads = (await _tenantDbContext.Set<MessageThread>()
            .AsNoTracking()
            .Where(thread => thread.ClientId == clientId && thread.ProjectId == projectId)
            .OrderByDescending(thread => thread.LastMessageAt)
            .ToListAsync(cancellationToken))
            .Where(thread => thread.Participants.Contains(userId))
            .ToList();

        Guid[] threadIds = threads.Select(thread => thread.Id).ToArray();
        Dictionary<Guid, int> unreadCounts = threadIds.Length == 0
            ? []
            : await _tenantDbContext.Set<Message>()
                .AsNoTracking()
                .Where(message =>
                    threadIds.Contains(message.ThreadId)
                    && message.SenderId != userId
                    && message.Status != MessageStatus.Read)
                .GroupBy(message => message.ThreadId)
                .Select(group => new { ThreadId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(entry => entry.ThreadId, entry => entry.Count, cancellationToken);

        return new ClientPortalProjectDetailDto(
            project.Id,
            project.Name,
            project.Description,
            project.Status,
            project.StartDate,
            project.EndDate,
            BuildMilestoneProgress(milestones),
            milestones
                .Select(milestone => new ClientPortalMilestoneDto(
                    milestone.Id,
                    milestone.Name,
                    milestone.DueDate,
                    milestone.Status,
                    milestone.CompletedAt))
                .ToList(),
            tasks
                .Select(task => new ClientPortalTaskDto(
                    task.Id,
                    task.MilestoneId,
                    task.Title,
                    task.Status,
                    task.Priority,
                    task.DueDate))
                .ToList(),
            contracts
                .Select(contract => new ClientPortalDocumentCardDto(
                    contract.Id,
                    contract.Title,
                    "contract",
                    contract.Status.ToString(),
                    contract.UpdatedAt))
                .ToList(),
            threads
                .Select(thread => new ClientPortalMessageThreadDto(
                    thread.Id,
                    thread.Subject,
                    thread.LastMessageAt,
                    unreadCounts.GetValueOrDefault(thread.Id, 0)))
                .ToList(),
            requests
                .Select(request => new ClientPortalProjectRequestDto(
                    request.Id,
                    request.Title,
                    request.Description,
                    request.Status,
                    request.Priority,
                    request.CreatedAt))
                .ToList());
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
