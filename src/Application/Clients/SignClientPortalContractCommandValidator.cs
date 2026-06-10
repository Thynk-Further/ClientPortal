using FluentValidation;

namespace Application.Clients;

public sealed class SignClientPortalContractCommandValidator
    : AbstractValidator<SignClientPortalContractCommand>
{
    public SignClientPortalContractCommandValidator()
    {
        RuleFor(command => command.ContractId)
            .NotEmpty();

        RuleFor(command => command.SignerName)
            .NotEmpty()
            .MaximumLength(200);
    }
}
