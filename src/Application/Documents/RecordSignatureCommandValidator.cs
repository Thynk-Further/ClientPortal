using FluentValidation;

namespace Application.Documents;

public sealed class RecordSignatureCommandValidator : AbstractValidator<RecordSignatureCommand>
{
    public RecordSignatureCommandValidator()
    {
        RuleFor(command => command.ContractId)
            .NotEmpty();

        RuleFor(command => command.ClientId)
            .NotEmpty();
    }
}
