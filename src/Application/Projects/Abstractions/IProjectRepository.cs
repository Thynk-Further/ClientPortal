using Domain;
using Application.Projects.Dtos;
using Shared;

namespace Application.Projects.Abstractions;

public interface IProjectRepository
{
    Task<Project?> FindByIdAsync(Guid projectId, CancellationToken cancellationToken = default);

    Task<ProjectDashboardDto?> GetDashboardAsync(Guid projectId, CancellationToken cancellationToken = default);

    Task<PagedResult<ProjectListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        ProjectStatus? status,
        Guid? clientId,
        string? search,
        CancellationToken cancellationToken = default);

    void Add(Project project);

    void Update(Project project);
}
