using Application.Projects.Abstractions;
using Application.Projects.Dtos;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed class GetProjectsQueryHandler : IRequestHandler<GetProjectsQuery, Result<PagedResult<ProjectListItemDto>>>
{
    private readonly IProjectRepository _projectRepository;

    public GetProjectsQueryHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result<PagedResult<ProjectListItemDto>>> Handle(
        GetProjectsQuery request,
        CancellationToken cancellationToken)
    {
        PagedResult<ProjectListItemDto> projects = await _projectRepository.GetPagedAsync(
            page: request.Page,
            pageSize: request.PageSize,
            status: request.Status,
            clientId: request.ClientId,
            search: request.Search,
            cancellationToken: cancellationToken);

        return Result<PagedResult<ProjectListItemDto>>.Success(projects);
    }
}
