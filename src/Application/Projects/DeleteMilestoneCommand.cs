using Application.Abstractions;
using Application.Projects.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Projects;

public sealed record DeleteMilestoneCommand(Guid MilestoneId) : IRequest<Result>;

public sealed class DeleteMilestoneCommandHandler : IRequestHandler<DeleteMilestoneCommand, Result>
{
    private static readonly Error MilestoneNotFoundError = new(
        "Milestones.NotFound",
        "Milestone was not found.",
        ErrorType.NotFound);

    private readonly IMilestoneRepository _milestoneRepository;
    private readonly IProjectTaskRepository _projectTaskRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteMilestoneCommandHandler(
        IMilestoneRepository milestoneRepository,
        IProjectTaskRepository projectTaskRepository,
        IUnitOfWork unitOfWork)
    {
        _milestoneRepository = milestoneRepository;
        _projectTaskRepository = projectTaskRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteMilestoneCommand request, CancellationToken cancellationToken)
    {
        Milestone? milestone = await _milestoneRepository.FindByIdAsync(request.MilestoneId, cancellationToken);
        if (milestone is null)
        {
            return Result.Failure(MilestoneNotFoundError);
        }

        IReadOnlyList<ProjectTask> tasks = await _projectTaskRepository.GetByProjectIdAsync(milestone.ProjectId, cancellationToken);
        foreach (ProjectTask task in tasks.Where(entity => entity.MilestoneId == milestone.Id))
        {
            _projectTaskRepository.Remove(task);
        }

        _milestoneRepository.Remove(milestone);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
