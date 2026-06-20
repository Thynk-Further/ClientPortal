using FluentValidation;

namespace Application.Team;

public sealed class AcceptStaffInvitationCommandValidator : AbstractValidator<AcceptStaffInvitationCommand>
{
    public AcceptStaffInvitationCommandValidator()
    {
        RuleFor(command => command.Token).NotEmpty();
        RuleFor(command => command.Password).NotEmpty().MinimumLength(8);
    }
}
