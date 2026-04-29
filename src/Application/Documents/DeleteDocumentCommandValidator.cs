using FluentValidation;

namespace Application.Documents;

public sealed class DeleteDocumentCommandValidator : AbstractValidator<DeleteDocumentCommand>
{
    public DeleteDocumentCommandValidator()
    {
        RuleFor(command => command.DocumentId)
            .NotEmpty();

        RuleFor(command => command.ClientId)
            .NotEmpty();
    }
}
