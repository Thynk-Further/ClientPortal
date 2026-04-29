using FluentValidation;

namespace Application.Documents;

public sealed class UploadNewVersionCommandValidator : AbstractValidator<UploadNewVersionCommand>
{
    public UploadNewVersionCommandValidator()
    {
        RuleFor(command => command.DocumentId)
            .NotEmpty();

        RuleFor(command => command.ClientId)
            .NotEmpty();

        RuleFor(command => command.UploadedBy)
            .NotEmpty();

        RuleFor(command => command.S3Key)
            .NotEmpty()
            .MaximumLength(2048);

        RuleFor(command => command.ChangeNotes)
            .MaximumLength(2000);
    }
}
