using FluentValidation;

namespace Application.Messaging;

public sealed class DeleteNoticeCommandValidator : AbstractValidator<DeleteNoticeCommand>
{
    public DeleteNoticeCommandValidator()
    {
        RuleFor(command => command.NoticeId)
            .NotEmpty();
    }
}
