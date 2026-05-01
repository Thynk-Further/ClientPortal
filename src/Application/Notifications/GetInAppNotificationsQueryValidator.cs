using FluentValidation;

namespace Application.Notifications;

public sealed class GetInAppNotificationsQueryValidator : AbstractValidator<GetInAppNotificationsQuery>
{
    public GetInAppNotificationsQueryValidator()
    {
        RuleFor(query => query.UserId).NotEmpty();
        RuleFor(query => query.Page).GreaterThan(0);
        RuleFor(query => query.PageSize).InclusiveBetween(1, 200);
    }
}
