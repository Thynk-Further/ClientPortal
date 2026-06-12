using Domain;

namespace Application.Clients.Dtos;

public sealed record ClientPortalProjectsResultDto(
    IReadOnlyList<ClientPortalProjectListItemDto> Projects);

public sealed record ClientPortalProjectListItemDto(
    Guid Id,
    string Name,
    ProjectStatus Status,
    DateOnly StartDate,
    DateOnly EndDate,
    ClientPortalMilestoneProgressDto MilestoneProgress,
    IReadOnlyList<ClientPortalProjectActivityDto> RecentActivity);

public sealed record ClientPortalMilestoneProgressDto(
    int TotalCount,
    int CompletedCount,
    int ProgressPercent);

public sealed record ClientPortalProjectActivityDto(
    DateTime OccurredAtUtc,
    string Type,
    string Description);

public sealed record ClientPortalProjectDetailDto(
    Guid Id,
    string Name,
    string Description,
    ProjectStatus Status,
    DateOnly StartDate,
    DateOnly EndDate,
    ClientPortalMilestoneProgressDto MilestoneProgress,
    IReadOnlyList<ClientPortalMilestoneDto> Milestones,
    IReadOnlyList<ClientPortalTaskDto> Tasks,
    IReadOnlyList<ClientPortalDocumentCardDto> Documents,
    IReadOnlyList<ClientPortalMessageThreadDto> MessageThreads,
    IReadOnlyList<ClientPortalProjectRequestDto> Requests);

public sealed record ClientPortalMilestoneDto(
    Guid Id,
    string Name,
    DateOnly DueDate,
    MilestoneStatus Status,
    DateTime? CompletedAtUtc);

public sealed record ClientPortalTaskDto(
    Guid Id,
    Guid MilestoneId,
    string Title,
    ProjectTaskStatus Status,
    ProjectTaskPriority Priority,
    DateOnly DueDate);

public sealed record ClientPortalMessageThreadDto(
    Guid Id,
    string Subject,
    DateTime LastMessageAt,
    int UnreadCount);

public sealed record ClientPortalProjectRequestDto(
    Guid Id,
    string Title,
    string Description,
    ClientRequestStatus Status,
    ClientRequestPriority Priority,
    DateTime CreatedAtUtc);
