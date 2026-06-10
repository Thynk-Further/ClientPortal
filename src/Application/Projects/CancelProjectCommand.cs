using Application.Abstractions;
using Application.Projects.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record CancelProjectCommand(Guid ProjectId) : IRequest<Result>;

public sealed class CancelProjectCommandHandler : IRequestHandler<CancelProjectCommand, Result>
{
    private static readonly Error ProjectNotFoundError = new(
        "Projects.NotFound",
        "Project was not found.",
        ErrorType.NotFound);

    private readonly IProjectRepository _projectRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CancelProjectCommandHandler(IProjectRepository projectRepository, IUnitOfWork unitOfWork)
    {
        _projectRepository = projectRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(CancelProjectCommand request, CancellationToken cancellationToken)
    {
        Project? project = await _projectRepository.FindByIdAsync(request.ProjectId, cancellationToken);
        if (project is null)
        {
            return Result.Failure(ProjectNotFoundError);
        }

        project.UpdateStatus(ProjectStatus.Cancelled);
        _projectRepository.Update(project);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
