using FluentValidation;

namespace Application.Notifications;

public sealed class MarkInAppNotificationReadCommandValidator : AbstractValidator<MarkInAppNotificationReadCommand>
{
    public MarkInAppNotificationReadCommandValidator()
    {
        RuleFor(command => command.NotificationId).NotEmpty();
        RuleFor(command => command.UserId).NotEmpty();
    }
}
