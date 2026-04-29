using FluentValidation;

namespace Application.Documents;

public sealed class GetDocumentDownloadUrlQueryValidator : AbstractValidator<GetDocumentDownloadUrlQuery>
{
    public GetDocumentDownloadUrlQueryValidator()
    {
        RuleFor(query => query.DocumentId)
            .NotEmpty();

        RuleFor(query => query.ClientId)
            .NotEmpty();
    }
}
