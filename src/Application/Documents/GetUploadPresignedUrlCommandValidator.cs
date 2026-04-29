using FluentValidation;

namespace Application.Documents;

public sealed class GetUploadPresignedUrlCommandValidator : AbstractValidator<GetUploadPresignedUrlCommand>
{
    public GetUploadPresignedUrlCommandValidator()
    {
        RuleFor(command => command.ClientId)
            .NotEmpty();

        RuleFor(command => command.UploadedBy)
            .NotEmpty();

        RuleFor(command => command.Name)
            .NotEmpty()
            .MaximumLength(256);

        RuleFor(command => command.Type)
            .NotEmpty()
            .MaximumLength(128);

        RuleForEach(command => command.Tags!)
            .NotEmpty()
            .MaximumLength(64)
            .When(command => command.Tags is not null);
    }
}
