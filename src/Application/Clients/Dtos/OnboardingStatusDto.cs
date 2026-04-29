namespace Application.Clients.Dtos;

public sealed record OnboardingStatusDto(
    Guid ClientId,
    int TotalSteps,
    int CompletedSteps,
    bool IsCompleted,
    IReadOnlyList<OnboardingStepStatusDto> Steps);
