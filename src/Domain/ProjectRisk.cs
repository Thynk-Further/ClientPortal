using Shared;

namespace Domain;

public sealed class ProjectRisk : AggregateRoot<Guid>
{
    public Guid ProjectId { get; private set; }

    public string Title { get; private set; } = string.Empty;

    public string Description { get; private set; } = string.Empty;

    public ProjectRiskSeverity Severity { get; private set; } = ProjectRiskSeverity.Medium;

    public ProjectRiskStatus Status { get; private set; } = ProjectRiskStatus.Open;

    public Guid OwnerId { get; private set; }

    public DateOnly? DueDate { get; private set; }

    private ProjectRisk()
    {
    }

    private ProjectRisk(
        Guid id,
        Guid projectId,
        string title,
        string description,
        ProjectRiskSeverity severity,
        ProjectRiskStatus status,
        Guid ownerId,
        DateOnly? dueDate)
        : base(id)
    {
        ProjectId = NormalizeProjectId(projectId);
        Title = NormalizeTitle(title);
        Description = NormalizeDescription(description);
        Severity = severity;
        Status = status;
        OwnerId = NormalizeOwnerId(ownerId);
        DueDate = dueDate;
    }

    public static ProjectRisk Create(
        Guid id,
        Guid projectId,
        string title,
        string description,
        ProjectRiskSeverity severity,
        Guid ownerId,
        DateOnly? dueDate = null,
        ProjectRiskStatus status = ProjectRiskStatus.Open)
    {
        return new ProjectRisk(id, projectId, title, description, severity, status, ownerId, dueDate);
    }

    public void UpdateTitle(string title)
    {
        Title = NormalizeTitle(title);
        MarkUpdated();
    }

    public void UpdateDescription(string description)
    {
        Description = NormalizeDescription(description);
        MarkUpdated();
    }

    public void UpdateSeverity(ProjectRiskSeverity severity)
    {
        Severity = severity;
        MarkUpdated();
    }

    public void UpdateStatus(ProjectRiskStatus status)
    {
        Status = status;
        MarkUpdated();
    }

    public void ReassignOwner(Guid ownerId)
    {
        OwnerId = NormalizeOwnerId(ownerId);
        MarkUpdated();
    }

    public void UpdateDueDate(DateOnly? dueDate)
    {
        DueDate = dueDate;
        MarkUpdated();
    }

    private static Guid NormalizeProjectId(Guid projectId)
    {
        if (projectId == Guid.Empty)
        {
            throw new ArgumentException("ProjectId cannot be empty.", nameof(projectId));
        }

        return projectId;
    }

    private static Guid NormalizeOwnerId(Guid ownerId)
    {
        if (ownerId == Guid.Empty)
        {
            throw new ArgumentException("OwnerId cannot be empty.", nameof(ownerId));
        }

        return ownerId;
    }

    private static string NormalizeTitle(string title)
    {
        return Guard.NotEmpty(title, nameof(title)).Trim();
    }

    private static string NormalizeDescription(string description)
    {
        return description?.Trim() ?? string.Empty;
    }
}
