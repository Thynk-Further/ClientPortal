using FluentValidation;

namespace Application.Clients;

public sealed class GetClientPortalDocumentDownloadUrlQueryValidator
    : AbstractValidator<GetClientPortalDocumentDownloadUrlQuery>
{
    public GetClientPortalDocumentDownloadUrlQueryValidator()
    {
        RuleFor(query => query.DocumentId)
            .NotEmpty();
    }
}
