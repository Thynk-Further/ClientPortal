using FluentValidation;

namespace Application.Documents;

public sealed class UpdateDocumentCommandValidator : AbstractValidator<UpdateDocumentCommand>
{
    public UpdateDocumentCommandValidator()
    {
        RuleFor(command => command.DocumentId)
            .NotEmpty();

        RuleFor(command => command.ClientId)
            .NotEmpty();

        RuleFor(command => command.Name)
            .NotEmpty()
            .MaximumLength(256);

        RuleForEach(command => command.Tags!)
            .NotEmpty()
            .MaximumLength(64)
            .When(command => command.Tags is not null);
    }
}
