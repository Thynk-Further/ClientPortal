using FluentValidation;

namespace Application.Clients;

public sealed class MarkClientPortalNoticeReadCommandValidator
    : AbstractValidator<MarkClientPortalNoticeReadCommand>
{
    public MarkClientPortalNoticeReadCommandValidator()
    {
        RuleFor(command => command.NoticeId)
            .NotEmpty();
    }
}
