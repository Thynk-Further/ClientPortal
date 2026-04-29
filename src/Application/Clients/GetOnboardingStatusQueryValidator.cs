using FluentValidation;

namespace Application.Clients;

public sealed class GetOnboardingStatusQueryValidator : AbstractValidator<GetOnboardingStatusQuery>
{
    public GetOnboardingStatusQueryValidator()
    {
        RuleFor(query => query.ClientId)
            .NotEmpty();
    }
}
