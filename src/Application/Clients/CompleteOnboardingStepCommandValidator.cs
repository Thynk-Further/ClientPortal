using FluentValidation;

namespace Application.Clients;

public sealed class CompleteOnboardingStepCommandValidator : AbstractValidator<CompleteOnboardingStepCommand>
{
    public CompleteOnboardingStepCommandValidator()
    {
        RuleFor(command => command.ClientId)
            .NotEmpty();

        RuleFor(command => command.StepKey)
            .NotEmpty()
            .MaximumLength(128);
    }
}
