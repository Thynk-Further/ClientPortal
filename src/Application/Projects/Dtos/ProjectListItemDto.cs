using Domain;

namespace Application.Projects.Dtos;

public sealed record ProjectListItemDto(
    Guid Id,
    Guid ClientId,
    string ClientCompanyName,
    string Name,
    ProjectStatus Status,
    DateOnly StartDate,
    DateOnly EndDate,
    decimal Budget,
    string Currency,
    ProjectHealth Health);

public sealed record ProjectTaskSummaryDto(
    int Total,
    int Todo,
    int InProgress,
    int Blocked,
    int Done);

public sealed record MyTaskListItemDto(
    Guid Id,
    Guid ProjectId,
    string ProjectName,
    Guid ClientId,
    string ClientCompanyName,
    string Title,
    ProjectTaskStatus Status,
    ProjectTaskPriority Priority,
    DateOnly DueDate);
