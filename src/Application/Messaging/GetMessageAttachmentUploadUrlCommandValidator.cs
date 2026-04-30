using FluentValidation;

namespace Application.Messaging;

public sealed class GetMessageAttachmentUploadUrlCommandValidator : AbstractValidator<GetMessageAttachmentUploadUrlCommand>
{
    public GetMessageAttachmentUploadUrlCommandValidator()
    {
        RuleFor(command => command.ThreadId).NotEmpty();
        RuleFor(command => command.UserId).NotEmpty();
        RuleFor(command => command.Attachment).NotNull();
        RuleFor(command => command.Attachment.FileName).NotEmpty().MaximumLength(256);
        RuleFor(command => command.Attachment.ContentType).NotEmpty().MaximumLength(128);
        RuleFor(command => command.Attachment.SizeBytes).GreaterThan(0).LessThanOrEqualTo(25 * 1024 * 1024);
        RuleFor(command => command.Attachment.Url).NotEmpty().MaximumLength(2048);
    }
}
