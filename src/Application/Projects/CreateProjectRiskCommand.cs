using Application.Abstractions;
using Application.Projects.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record CreateProjectRiskCommand(
    Guid ProjectId,
    string Title,
    string Description,
    ProjectRiskSeverity Severity,
    Guid OwnerId,
    DateOnly? DueDate = null) : IRequest<Result<Guid>>;

public sealed class CreateProjectRiskCommandHandler : IRequestHandler<CreateProjectRiskCommand, Result<Guid>>
{
    private static readonly Error ProjectNotFoundError = new(
        "Projects.NotFound",
        "Project was not found.",
        ErrorType.NotFound);

    private readonly IProjectRepository _projectRepository;
    private readonly IProjectRiskRepository _projectRiskRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateProjectRiskCommandHandler(
        IProjectRepository projectRepository,
        IProjectRiskRepository projectRiskRepository,
        IUnitOfWork unitOfWork)
    {
        _projectRepository = projectRepository;
        _projectRiskRepository = projectRiskRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(CreateProjectRiskCommand request, CancellationToken cancellationToken)
    {
        Project? project = await _projectRepository.FindByIdAsync(request.ProjectId, cancellationToken);
        if (project is null)
        {
            return Result<Guid>.Failure(ProjectNotFoundError);
        }

        ProjectRisk risk = ProjectRisk.Create(
            id: Guid.CreateVersion7(),
            projectId: request.ProjectId,
            title: request.Title,
            description: request.Description,
            severity: request.Severity,
            ownerId: request.OwnerId,
            dueDate: request.DueDate);

        _projectRiskRepository.Add(risk);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<Guid>.Success(risk.Id);
    }
}
