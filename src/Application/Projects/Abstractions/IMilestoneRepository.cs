using Domain;

namespace Application.Projects.Abstractions;

public interface IMilestoneRepository
{
    Task<Milestone?> FindByIdAsync(Guid milestoneId, CancellationToken cancellationToken = default);

    Task<bool> ExistsIncompleteByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Milestone>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default);

    void Add(Milestone milestone);

    void Update(Milestone milestone);

    void Remove(Milestone milestone);
}
