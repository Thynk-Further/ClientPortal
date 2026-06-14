using FluentValidation;

namespace Application.Meetings;

public sealed class ScheduleMeetingCommandValidator : AbstractValidator<ScheduleMeetingCommand>
{
    public ScheduleMeetingCommandValidator()
    {
        RuleFor(command => command.ClientId)
            .NotEmpty();

        RuleFor(command => command.Title)
            .NotEmpty()
            .MaximumLength(250);

        RuleFor(command => command.Description)
            .NotEmpty()
            .MaximumLength(4000);

        RuleFor(command => command.ScheduledAt)
            .NotEqual(default(DateTime))
            .Must(value => value.ToUniversalTime() > DateTime.UtcNow)
            .WithMessage("ScheduledAt must be in the future.");

        RuleFor(command => command.DurationMinutes)
            .InclusiveBetween(1, 24 * 60);

        RuleFor(command => command.MeetingUrl)
            .NotEmpty()
            .Must(BeAbsoluteHttpUrl)
            .WithMessage("MeetingUrl must be a valid absolute HTTP/HTTPS URL.");

        RuleFor(command => command.ScheduledTimeZoneId)
            .NotEmpty()
            .MaximumLength(64);

        RuleForEach(command => command.Attendees)
            .NotEmpty();
    }

    private static bool BeAbsoluteHttpUrl(string meetingUrl)
    {
        return Uri.TryCreate(meetingUrl, UriKind.Absolute, out Uri? uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
