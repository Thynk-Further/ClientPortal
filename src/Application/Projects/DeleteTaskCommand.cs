using Application.Abstractions;
using Application.Projects.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record DeleteTaskCommand(Guid TaskId) : IRequest<Result>;

public sealed class DeleteTaskCommandHandler : IRequestHandler<DeleteTaskCommand, Result>
{
    private static readonly Error TaskNotFoundError = new(
        "Tasks.NotFound",
        "Task was not found.",
        ErrorType.NotFound);

    private readonly IProjectTaskRepository _projectTaskRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteTaskCommandHandler(IProjectTaskRepository projectTaskRepository, IUnitOfWork unitOfWork)
    {
        _projectTaskRepository = projectTaskRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteTaskCommand request, CancellationToken cancellationToken)
    {
        ProjectTask? task = await _projectTaskRepository.FindByIdAsync(request.TaskId, cancellationToken);
        if (task is null)
        {
            return Result.Failure(TaskNotFoundError);
        }

        _projectTaskRepository.Remove(task);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
