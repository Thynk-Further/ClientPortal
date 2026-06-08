using Application.Abstractions;
using Application.Projects.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record UpdateProjectRiskCommand(
    Guid RiskId,
    string Title,
    string Description,
    ProjectRiskSeverity Severity,
    ProjectRiskStatus Status,
    Guid OwnerId,
    DateOnly? DueDate = null) : IRequest<Result>;

public sealed class UpdateProjectRiskCommandHandler : IRequestHandler<UpdateProjectRiskCommand, Result>
{
    private static readonly Error RiskNotFoundError = new(
        "Risks.NotFound",
        "Project risk was not found.",
        ErrorType.NotFound);

    private readonly IProjectRiskRepository _projectRiskRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateProjectRiskCommandHandler(IProjectRiskRepository projectRiskRepository, IUnitOfWork unitOfWork)
    {
        _projectRiskRepository = projectRiskRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateProjectRiskCommand request, CancellationToken cancellationToken)
    {
        ProjectRisk? risk = await _projectRiskRepository.FindByIdAsync(request.RiskId, cancellationToken);
        if (risk is null)
        {
            return Result.Failure(RiskNotFoundError);
        }

        risk.UpdateTitle(request.Title);
        risk.UpdateDescription(request.Description);
        risk.UpdateSeverity(request.Severity);
        risk.UpdateStatus(request.Status);
        risk.ReassignOwner(request.OwnerId);
        risk.UpdateDueDate(request.DueDate);

        _projectRiskRepository.Update(risk);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
