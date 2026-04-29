using FluentValidation;

namespace Application.Documents;

public sealed class ConfirmUploadCommandValidator : AbstractValidator<ConfirmUploadCommand>
{
    public ConfirmUploadCommandValidator()
    {
        RuleFor(command => command.DocumentId)
            .NotEmpty();

        RuleFor(command => command.ClientId)
            .NotEmpty();
    }
}
