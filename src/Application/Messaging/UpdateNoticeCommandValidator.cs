using FluentValidation;

namespace Application.Messaging;

public sealed class UpdateNoticeCommandValidator : AbstractValidator<UpdateNoticeCommand>
{
    public UpdateNoticeCommandValidator()
    {
        RuleFor(command => command.NoticeId)
            .NotEmpty();

        RuleFor(command => command.Title)
            .NotEmpty()
            .MaximumLength(250);

        RuleFor(command => command.Content)
            .NotEmpty()
            .MaximumLength(8000);

        RuleForEach(command => command.TargetClientIds)
            .NotEmpty();
    }
}
