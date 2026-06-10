using Application.Abstractions;
using Application.Projects.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record DeleteProjectRiskCommand(Guid RiskId) : IRequest<Result>;

public sealed class DeleteProjectRiskCommandHandler : IRequestHandler<DeleteProjectRiskCommand, Result>
{
    private static readonly Error RiskNotFoundError = new(
        "Risks.NotFound",
        "Project risk was not found.",
        ErrorType.NotFound);

    private readonly IProjectRiskRepository _projectRiskRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteProjectRiskCommandHandler(IProjectRiskRepository projectRiskRepository, IUnitOfWork unitOfWork)
    {
        _projectRiskRepository = projectRiskRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteProjectRiskCommand request, CancellationToken cancellationToken)
    {
        ProjectRisk? risk = await _projectRiskRepository.FindByIdAsync(request.RiskId, cancellationToken);
        if (risk is null)
        {
            return Result.Failure(RiskNotFoundError);
        }

        _projectRiskRepository.Remove(risk);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
