using FluentValidation;

namespace Application.Clients;

public sealed class GetClientPortalDocumentByIdQueryValidator
    : AbstractValidator<GetClientPortalDocumentByIdQuery>
{
    public GetClientPortalDocumentByIdQueryValidator()
    {
        RuleFor(query => query.DocumentId)
            .NotEmpty();
    }
}
