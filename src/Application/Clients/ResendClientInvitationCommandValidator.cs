using FluentValidation;

namespace Application.Clients;

public sealed class ResendClientInvitationCommandValidator : AbstractValidator<ResendClientInvitationCommand>
{
    public ResendClientInvitationCommandValidator()
    {
        RuleFor(command => command.ClientId).NotEmpty();
    }
}
