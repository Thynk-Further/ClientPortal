using Domain;
using FluentValidation;

namespace Application.Clients;

public sealed class UpdateClientPortalNotificationPreferencesCommandValidator
    : AbstractValidator<UpdateClientPortalNotificationPreferencesCommand>
{
    public UpdateClientPortalNotificationPreferencesCommandValidator()
    {
        RuleFor(command => command.Frequency).IsInEnum();
    }
}
