using FluentValidation;

namespace Application.Documents;

public sealed class SendContractForSigningCommandValidator : AbstractValidator<SendContractForSigningCommand>
{
    public SendContractForSigningCommandValidator()
    {
        RuleFor(command => command.ContractId)
            .NotEmpty();

        RuleFor(command => command.ClientId)
            .NotEmpty();
    }
}
