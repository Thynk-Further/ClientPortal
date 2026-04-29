namespace Application.Clients.Dtos;

public sealed record OnboardingStepStatusDto(
    string StepKey,
    bool IsCompleted);
