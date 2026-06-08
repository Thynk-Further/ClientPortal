using FluentValidation;

namespace Application.Clients;

public sealed class GetClientWorkspaceQueryValidator : AbstractValidator<GetClientWorkspaceQuery>
{
    public GetClientWorkspaceQueryValidator()
    {
        RuleFor(query => query.ClientId).NotEmpty();
    }
}
