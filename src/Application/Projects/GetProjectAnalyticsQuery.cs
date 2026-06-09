using Application.Projects.Abstractions;
using Application.Projects.Dtos;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record GetProjectAnalyticsQuery : IRequest<Result<ProjectAnalyticsDto>>;

public sealed class GetProjectAnalyticsQueryHandler
    : IRequestHandler<GetProjectAnalyticsQuery, Result<ProjectAnalyticsDto>>
{
    private readonly IProjectRepository _projectRepository;

    public GetProjectAnalyticsQueryHandler(IProjectRepository projectRepository)
    {
        _projectRepository = projectRepository;
    }

    public async Task<Result<ProjectAnalyticsDto>> Handle(
        GetProjectAnalyticsQuery request,
        CancellationToken cancellationToken)
    {
        ProjectAnalyticsDto analytics = await _projectRepository.GetAnalyticsAsync(cancellationToken);
        return Result<ProjectAnalyticsDto>.Success(analytics);
    }
}
