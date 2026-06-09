using Domain;

namespace Application.Projects.Abstractions;

public interface IProjectRiskRepository
{
    Task<ProjectRisk?> FindByIdAsync(Guid riskId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProjectRisk>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default);

    void Add(ProjectRisk risk);

    void Update(ProjectRisk risk);

    void Remove(ProjectRisk risk);
}
