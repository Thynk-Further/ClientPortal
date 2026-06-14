using FluentValidation;

namespace Application.Clients;

public sealed class DeclineClientPortalMeetingCommandValidator : AbstractValidator<DeclineClientPortalMeetingCommand>
{
    public DeclineClientPortalMeetingCommandValidator()
    {
        RuleFor(command => command.MeetingId)
            .NotEmpty();
    }
}
