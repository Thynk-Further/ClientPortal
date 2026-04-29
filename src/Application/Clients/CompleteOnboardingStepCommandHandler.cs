using Application.Abstractions;
using Application.Clients.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class CompleteOnboardingStepCommandHandler : IRequestHandler<CompleteOnboardingStepCommand, Result>
{
    private static readonly Error OnboardingChecklistNotFoundError = new(
        "Onboarding.ChecklistNotFound",
        "Onboarding checklist was not found for the specified client.",
        ErrorType.NotFound);

    private static readonly Error InvalidStepError = new(
        "Onboarding.InvalidStep",
        "The onboarding step is not configured for this tenant.",
        ErrorType.Validation);

    private readonly IOnboardingChecklistRepository _onboardingChecklistRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CompleteOnboardingStepCommandHandler(
        IOnboardingChecklistRepository onboardingChecklistRepository,
        IUnitOfWork unitOfWork)
    {
        _onboardingChecklistRepository = onboardingChecklistRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(CompleteOnboardingStepCommand request, CancellationToken cancellationToken)
    {
        OnboardingChecklist? checklist = await _onboardingChecklistRepository.FindByClientIdAsync(request.ClientId, cancellationToken);
        if (checklist is null)
        {
            return Result.Failure(OnboardingChecklistNotFoundError);
        }

        try
        {
            checklist.CompleteStep(request.StepKey);
        }
        catch (ArgumentException)
        {
            return Result.Failure(InvalidStepError);
        }

        _onboardingChecklistRepository.Update(checklist);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
