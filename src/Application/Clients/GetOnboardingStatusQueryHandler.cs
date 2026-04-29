using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetOnboardingStatusQueryHandler : IRequestHandler<GetOnboardingStatusQuery, Result<OnboardingStatusDto>>
{
    private static readonly Error OnboardingChecklistNotFoundError = new(
        "Onboarding.ChecklistNotFound",
        "Onboarding checklist was not found for the specified client.",
        ErrorType.NotFound);

    private readonly IOnboardingChecklistRepository _onboardingChecklistRepository;

    public GetOnboardingStatusQueryHandler(IOnboardingChecklistRepository onboardingChecklistRepository)
    {
        _onboardingChecklistRepository = onboardingChecklistRepository;
    }

    public async Task<Result<OnboardingStatusDto>> Handle(GetOnboardingStatusQuery request, CancellationToken cancellationToken)
    {
        OnboardingChecklist? checklist = await _onboardingChecklistRepository.FindByClientIdAsync(request.ClientId, cancellationToken);
        if (checklist is null)
        {
            return Result<OnboardingStatusDto>.Failure(OnboardingChecklistNotFoundError);
        }

        HashSet<string> completed = checklist.CompletedStepKeys.ToHashSet(StringComparer.Ordinal);
        IReadOnlyList<OnboardingStepStatusDto> steps = checklist.ConfiguredStepKeys
            .Select(step => new OnboardingStepStatusDto(step, completed.Contains(step)))
            .ToList();

        int totalSteps = steps.Count;
        int completedSteps = steps.Count(step => step.IsCompleted);
        OnboardingStatusDto result = new(
            checklist.ClientId,
            totalSteps,
            completedSteps,
            totalSteps > 0 && completedSteps == totalSteps,
            steps);

        return Result<OnboardingStatusDto>.Success(result);
    }
}
