using Application.Projects.Dtos;
using Domain;
using Shared;

namespace Application.Projects.Abstractions;

public interface IProjectTaskRepository
{
    Task<ProjectTask?> FindByIdAsync(Guid taskId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProjectTask>> GetByProjectIdAsync(Guid projectId, CancellationToken cancellationToken = default);

    Task<PagedResult<MyTaskListItemDto>> GetByAssigneePagedAsync(
        Guid assigneeId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    void Add(ProjectTask task);

    void Update(ProjectTask task);

    void Remove(ProjectTask task);
}
