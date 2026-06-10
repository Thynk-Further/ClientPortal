using FluentValidation;

namespace Application.Clients;

public sealed class UpdateClientPortalProfileCommandValidator
    : AbstractValidator<UpdateClientPortalProfileCommand>
{
    public UpdateClientPortalProfileCommandValidator()
    {
        RuleFor(command => command.ContactName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(command => command.Phone)
            .NotEmpty()
            .Matches(@"^\+[1-9]\d{7,14}$");
    }
}
