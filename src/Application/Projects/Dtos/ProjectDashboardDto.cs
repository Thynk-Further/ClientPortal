using Domain;

namespace Application.Projects.Dtos;

public sealed record ProjectDashboardDto(
    Guid ProjectId,
    Guid ClientId,
    string ClientCompanyName,
    string Name,
    string Description,
    ProjectStatus Status,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal Budget,
    string Currency,
    ProjectHealth Health,
    int OpenRiskCount,
    int OverdueMilestoneCount,
    ProjectTaskSummaryDto TaskSummary,
    IReadOnlyCollection<ProjectDashboardMilestoneDto> Milestones,
    IReadOnlyCollection<ProjectDashboardTaskDto> Tasks,
    IReadOnlyCollection<ProjectDashboardRequestDto> Requests,
    IReadOnlyCollection<ProjectDashboardRiskDto> Risks,
    IReadOnlyCollection<ProjectDashboardActivityDto> RecentActivity);

public sealed record ProjectDashboardMilestoneDto(
    Guid Id,
    string Name,
    DateOnly DueDate,
    MilestoneStatus Status,
    DateTime? CompletedAtUtc);

public sealed record ProjectDashboardTaskDto(
    Guid Id,
    Guid MilestoneId,
    string Title,
    Guid AssigneeId,
    ProjectTaskStatus Status,
    ProjectTaskPriority Priority,
    DateOnly DueDate);

public sealed record ProjectDashboardRequestDto(
    Guid Id,
    Guid ClientId,
    string Title,
    string Description,
    ClientRequestStatus Status,
    ClientRequestPriority Priority);

public sealed record ProjectDashboardRiskDto(
    Guid Id,
    string Title,
    string Description,
    ProjectRiskSeverity Severity,
    ProjectRiskStatus Status,
    Guid OwnerId,
    DateOnly? DueDate);

public sealed record ProjectDashboardActivityDto(
    DateTime OccurredAtUtc,
    string Type,
    string Description);
