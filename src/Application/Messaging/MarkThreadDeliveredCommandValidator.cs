using FluentValidation;

namespace Application.Messaging;

public sealed class MarkThreadDeliveredCommandValidator : AbstractValidator<MarkThreadDeliveredCommand>
{
    public MarkThreadDeliveredCommandValidator()
    {
        RuleFor(command => command.ThreadId)
            .NotEmpty();

        RuleFor(command => command.RecipientId)
            .NotEmpty();
    }
}
