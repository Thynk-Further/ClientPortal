using FluentValidation;

namespace Application.Messaging;

public sealed class CreateThreadCommandValidator : AbstractValidator<CreateThreadCommand>
{
    public CreateThreadCommandValidator()
    {
        RuleFor(command => command.ClientId)
            .NotEmpty();

        RuleFor(command => command.CreatorId)
            .NotEmpty();

        RuleFor(command => command.ParticipantIds)
            .NotNull();

        RuleForEach(command => command.ParticipantIds)
            .NotEmpty()
            .When(command => command.ParticipantIds.Count > 0);

        RuleFor(command => command.Subject)
            .NotEmpty()
            .MaximumLength(300);
    }
}
