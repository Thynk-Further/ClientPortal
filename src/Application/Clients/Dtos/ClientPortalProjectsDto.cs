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
