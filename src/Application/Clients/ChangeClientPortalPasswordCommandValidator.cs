using FluentValidation;

namespace Application.Clients;

public sealed class ChangeClientPortalPasswordCommandValidator
    : AbstractValidator<ChangeClientPortalPasswordCommand>
{
    public ChangeClientPortalPasswordCommandValidator()
    {
        RuleFor(command => command.CurrentPassword)
            .NotEmpty();

        RuleFor(command => command.NewPassword)
            .NotEmpty()
            .MinimumLength(8)
            .NotEqual(command => command.CurrentPassword)
            .WithMessage("New password must be different from the current password.");
    }
}
