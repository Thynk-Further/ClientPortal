using Domain;
using FluentValidation;

namespace Application.Team;

public sealed class InviteTeamMemberCommandValidator : AbstractValidator<InviteTeamMemberCommand>
{
    public InviteTeamMemberCommandValidator()
    {
        RuleFor(command => command.FullName).NotEmpty().MaximumLength(256);
        RuleFor(command => command.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(command => command.Role)
            .Must(role => role is Role.Owner or Role.Admin or Role.Staff)
            .WithMessage("Role must be Owner, Admin, or Staff.");
    }
}
