using FluentValidation;

namespace Application.Clients;

public sealed class GetClientPortalMessageAttachmentUploadUrlCommandValidator
    : AbstractValidator<GetClientPortalMessageAttachmentUploadUrlCommand>
{
    public GetClientPortalMessageAttachmentUploadUrlCommandValidator()
    {
        RuleFor(command => command.ThreadId)
            .NotEmpty();

        RuleFor(command => command.FileName)
            .NotEmpty()
            .MaximumLength(256);

        RuleFor(command => command.ContentType)
            .NotEmpty()
            .MaximumLength(128);

        RuleFor(command => command.SizeBytes)
            .GreaterThan(0)
            .LessThanOrEqualTo(25 * 1024 * 1024);
    }
}
