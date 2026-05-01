using FluentValidation;

namespace Application.Notifications;

public sealed class GetNotificationPreferencesQueryValidator : AbstractValidator<GetNotificationPreferencesQuery>
{
    public GetNotificationPreferencesQueryValidator()
    {
        RuleFor(query => query.UserId).NotEmpty();
    }
}
