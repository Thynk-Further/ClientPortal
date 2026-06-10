using FluentValidation;

namespace Application.Clients;

public sealed class GetClientPortalProjectDetailQueryValidator
    : AbstractValidator<GetClientPortalProjectDetailQuery>
{
    public GetClientPortalProjectDetailQueryValidator()
    {
        RuleFor(query => query.ProjectId).NotEmpty();
    }
}
