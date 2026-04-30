using FluentValidation;

namespace Application.Messaging;

public sealed class SendMessageCommandValidator : AbstractValidator<SendMessageCommand>
{
    public SendMessageCommandValidator()
    {
        RuleFor(command => command.ThreadId)
            .NotEmpty();

        RuleFor(command => command.SenderId)
            .NotEmpty();

        RuleFor(command => command.SenderRole)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(command => command.ClientMessageId)
            .NotEmpty()
            .MaximumLength(120);

        RuleFor(command => command.Content)
            .NotEmpty()
            .MaximumLength(4000);

        RuleFor(command => command.ReplyToMessageId)
            .Must(replyToMessageId => !replyToMessageId.HasValue || replyToMessageId.Value != Guid.Empty)
            .WithMessage("ReplyToMessageId cannot be empty when provided.");

        RuleFor(command => command.EmojiReaction)
            .MaximumLength(32)
            .When(command => !string.IsNullOrWhiteSpace(command.EmojiReaction));

        RuleFor(command => command.Attachment!.FileName)
            .NotEmpty()
            .MaximumLength(256)
            .When(command => command.Attachment is not null);

        RuleFor(command => command.Attachment!.ContentType)
            .NotEmpty()
            .MaximumLength(128)
            .When(command => command.Attachment is not null);

        RuleFor(command => command.Attachment!.SizeBytes)
            .GreaterThan(0)
            .LessThanOrEqualTo(25 * 1024 * 1024)
            .When(command => command.Attachment is not null);

        RuleFor(command => command.Attachment!.Url)
            .NotEmpty()
            .MaximumLength(2048)
            .When(command => command.Attachment is not null);
    }
}
