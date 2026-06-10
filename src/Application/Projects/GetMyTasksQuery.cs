using Application.Abstractions;
using Application.Projects.Abstractions;
using Application.Projects.Dtos;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record GetMyTasksQuery(
    int Page = 1,
    int PageSize = 50) : IRequest<Result<PagedResult<MyTaskListItemDto>>>;

public sealed class GetMyTasksQueryHandler : IRequestHandler<GetMyTasksQuery, Result<PagedResult<MyTaskListItemDto>>>
{
    private static readonly Error UserNotAuthenticatedError = new(
        "Auth.Unauthenticated",
        "Current user is not authenticated.",
        ErrorType.Forbidden);

    private readonly ICurrentUser _currentUser;
    private readonly IProjectTaskRepository _projectTaskRepository;

    public GetMyTasksQueryHandler(ICurrentUser currentUser, IProjectTaskRepository projectTaskRepository)
    {
        _currentUser = currentUser;
        _projectTaskRepository = projectTaskRepository;
    }

    public async Task<Result<PagedResult<MyTaskListItemDto>>> Handle(GetMyTasksQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<PagedResult<MyTaskListItemDto>>.Failure(UserNotAuthenticatedError);
        }

        PagedResult<MyTaskListItemDto> tasks = await _projectTaskRepository.GetByAssigneePagedAsync(
            _currentUser.UserId.Value,
            request.Page,
            request.PageSize,
            cancellationToken);

        return Result<PagedResult<MyTaskListItemDto>>.Success(tasks);
    }
}
