using FluentValidation;

namespace Application.Clients;

public sealed class GetClientPortalMessageThreadsQueryValidator
    : AbstractValidator<GetClientPortalMessageThreadsQuery>
{
    public GetClientPortalMessageThreadsQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThan(0);

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 100);
    }
}
