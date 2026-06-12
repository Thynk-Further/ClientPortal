using FluentValidation;

namespace Application.Clients;

public sealed class SendClientPortalMessageCommandValidator
    : AbstractValidator<SendClientPortalMessageCommand>
{
    public SendClientPortalMessageCommandValidator()
    {
        RuleFor(command => command.ThreadId)
            .NotEmpty();

        RuleFor(command => command.ClientMessageId)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(command => command.Content)
            .NotEmpty()
            .MaximumLength(4000);
    }
}
