using FluentValidation;

namespace Application.Clients;

public sealed class GetClientPortalThreadMessagesQueryValidator
    : AbstractValidator<GetClientPortalThreadMessagesQuery>
{
    public GetClientPortalThreadMessagesQueryValidator()
    {
        RuleFor(query => query.ThreadId)
            .NotEmpty();

        RuleFor(query => query.Page)
            .GreaterThan(0);

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 100);
    }
}
