using FluentValidation;

namespace Application.Clients;

public sealed class AcceptClientPortalMeetingCommandValidator : AbstractValidator<AcceptClientPortalMeetingCommand>
{
    public AcceptClientPortalMeetingCommandValidator()
    {
        RuleFor(command => command.MeetingId)
            .NotEmpty();
    }
}
