using Domain;

namespace Application.Projects;

public static class ProjectHealthCalculator
{
    private const double BlockedTaskRedThreshold = 0.30;

    public static ProjectHealth Calculate(
        IReadOnlyCollection<Milestone> milestones,
        IReadOnlyCollection<ProjectTask> tasks,
        IReadOnlyCollection<ProjectRisk> risks,
        DateOnly today)
    {
        if (HasRedSignals(milestones, tasks, risks, today))
        {
            return ProjectHealth.Red;
        }

        if (HasAmberSignals(milestones, tasks, risks, today))
        {
            return ProjectHealth.Amber;
        }

        return ProjectHealth.Green;
    }

    private static bool HasRedSignals(
        IReadOnlyCollection<Milestone> milestones,
        IReadOnlyCollection<ProjectTask> tasks,
        IReadOnlyCollection<ProjectRisk> risks,
        DateOnly today)
    {
        bool hasOverdueMilestone = milestones.Any(milestone =>
            milestone.Status != MilestoneStatus.Completed && milestone.DueDate < today);

        bool hasCriticalOrHighOpenRisk = risks.Any(risk =>
            risk.Status == ProjectRiskStatus.Open
            && risk.Severity is ProjectRiskSeverity.Critical or ProjectRiskSeverity.High);

        bool hasTooManyBlockedTasks = tasks.Count > 0
            && tasks.Count(task => task.Status == ProjectTaskStatus.Blocked) / (double)tasks.Count > BlockedTaskRedThreshold;

        return hasOverdueMilestone || hasCriticalOrHighOpenRisk || hasTooManyBlockedTasks;
    }

    private static bool HasAmberSignals(
        IReadOnlyCollection<Milestone> milestones,
        IReadOnlyCollection<ProjectTask> tasks,
        IReadOnlyCollection<ProjectRisk> risks,
        DateOnly today)
    {
        DateOnly dueSoonThreshold = today.AddDays(7);

        bool hasMediumOpenRisk = risks.Any(risk =>
            risk.Status == ProjectRiskStatus.Open && risk.Severity == ProjectRiskSeverity.Medium);

        bool hasMilestoneDueSoon = milestones.Any(milestone =>
            milestone.Status != MilestoneStatus.Completed
            && milestone.DueDate >= today
            && milestone.DueDate <= dueSoonThreshold);

        bool hasBlockedTask = tasks.Any(task => task.Status == ProjectTaskStatus.Blocked);

        return hasMediumOpenRisk || hasMilestoneDueSoon || hasBlockedTask;
    }
}
