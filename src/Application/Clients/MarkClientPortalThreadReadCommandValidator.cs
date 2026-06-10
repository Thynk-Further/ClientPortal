using FluentValidation;

namespace Application.Clients;

public sealed class MarkClientPortalThreadReadCommandValidator
    : AbstractValidator<MarkClientPortalThreadReadCommand>
{
    public MarkClientPortalThreadReadCommandValidator()
    {
        RuleFor(command => command.ThreadId)
            .NotEmpty();
    }
}
