using Domain;

namespace Application.Projects.Dtos;

public sealed record ProjectStatusCountDto(ProjectStatus Status, int Count);

public sealed record ProjectHealthCountDto(ProjectHealth Health, int Count);

public sealed record ProjectBudgetByCurrencyDto(string Currency, decimal TotalBudget, int ProjectCount);

public sealed record ProjectAtRiskItemDto(
    Guid Id,
    string Name,
    string ClientCompanyName,
    ProjectStatus Status,
    ProjectHealth Health,
    int OverdueMilestoneCount,
    int OpenRiskCount);

public sealed record ProjectAnalyticsDto(
    int TotalProjects,
    ProjectTaskSummaryDto TaskSummary,
    int OverdueMilestoneCount,
    int OpenRiskCount,
    int OverdueTaskCount,
    IReadOnlyList<ProjectStatusCountDto> StatusBreakdown,
    IReadOnlyList<ProjectHealthCountDto> HealthBreakdown,
    IReadOnlyList<ProjectBudgetByCurrencyDto> BudgetByCurrency,
    IReadOnlyList<ProjectAtRiskItemDto> AtRiskProjects);
