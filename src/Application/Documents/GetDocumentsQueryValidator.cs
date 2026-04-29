using FluentValidation;

namespace Application.Documents;

public sealed class GetDocumentsQueryValidator : AbstractValidator<GetDocumentsQuery>
{
    public GetDocumentsQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThan(0);

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 200);

        RuleFor(query => query.Type)
            .MaximumLength(128);

        RuleFor(query => query)
            .Must(query => !query.CreatedFromUtc.HasValue || !query.CreatedToUtc.HasValue || query.CreatedFromUtc <= query.CreatedToUtc)
            .WithMessage("CreatedFromUtc must be less than or equal to CreatedToUtc.");
    }
}
