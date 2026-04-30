using FluentValidation;

namespace Application.Invoices;

public sealed class GetQuotesQueryValidator : AbstractValidator<GetQuotesQuery>
{
    public GetQuotesQueryValidator()
    {
        RuleFor(query => query.Page).GreaterThan(0);
        RuleFor(query => query.PageSize).InclusiveBetween(1, 200);
        RuleFor(query => query)
            .Must(query => !query.DueDateFrom.HasValue || !query.DueDateTo.HasValue || query.DueDateFrom <= query.DueDateTo)
            .WithMessage("DueDateFrom must be less than or equal to DueDateTo.");
    }
}
