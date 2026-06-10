using FluentValidation;

namespace Application.Clients;

public sealed class SubmitClientPortalRequestCommandValidator
    : AbstractValidator<SubmitClientPortalRequestCommand>
{
    public SubmitClientPortalRequestCommandValidator()
    {
        RuleFor(command => command.ProjectId)
            .NotEmpty();

        RuleFor(command => command.Title)
            .NotEmpty()
            .MaximumLength(300);

        RuleFor(command => command.Description)
            .NotEmpty()
            .MaximumLength(4000);

        RuleFor(command => command.Priority)
            .IsInEnum();
    }
}
