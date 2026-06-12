using FluentValidation;

namespace Application.Finance;

public sealed class CreateClientPortalRfqCommandValidator : AbstractValidator<CreateClientPortalRfqCommand>
{
    public CreateClientPortalRfqCommandValidator()
    {
        RuleFor(command => command.ProjectId).NotEmpty();
        RuleFor(command => command.RfqNumber).NotEmpty().MaximumLength(64);
        RuleFor(command => command.Currency).NotEmpty().Length(3);
        RuleFor(command => command.LineItems).NotEmpty();
        RuleForEach(command => command.LineItems).ChildRules(item =>
        {
            item.RuleFor(line => line.Description).NotEmpty().MaximumLength(2000);
            item.RuleFor(line => line.Quantity).GreaterThan(0);
        });
    }
}
