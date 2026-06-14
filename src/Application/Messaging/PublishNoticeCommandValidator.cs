using FluentValidation;
using Domain;

namespace Application.Messaging;

public sealed class PublishNoticeCommandValidator : AbstractValidator<PublishNoticeCommand>
{
    public PublishNoticeCommandValidator()
    {
        RuleFor(command => command.Title)
            .NotEmpty()
            .MaximumLength(250);

        RuleFor(command => command.Content)
            .NotEmpty()
            .MaximumLength(8000);

        RuleFor(command => command.ExpiresAt)
            .Must(value => !value.HasValue || value.Value > DateTime.UtcNow)
            .WithMessage("ExpiresAt must be a future datetime when provided.");

        RuleForEach(command => command.TargetClientIds)
            .NotEmpty();

        RuleFor(command => command.Attachments)
            .Must(attachments => attachments is null || attachments.Count <= Notice.MaxAttachments)
            .WithMessage($"A notice cannot have more than {Notice.MaxAttachments} attachments.");

        RuleForEach(command => command.Attachments)
            .ChildRules(attachment =>
            {
                attachment.RuleFor(item => item.FileName).NotEmpty().MaximumLength(256);
                attachment.RuleFor(item => item.ContentType).NotEmpty().MaximumLength(128);
                attachment.RuleFor(item => item.SizeBytes).InclusiveBetween(1, 25 * 1024 * 1024);
                attachment.RuleFor(item => item.Url).NotEmpty().MaximumLength(2048);
            })
            .When(command => command.Attachments is not null);
    }
}
