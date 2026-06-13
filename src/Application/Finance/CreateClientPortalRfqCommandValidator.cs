using FluentValidation;

namespace Application.Finance;

public sealed class CreateClientPortalRfqCommandValidator : AbstractValidator<CreateClientPortalRfqCommand>
{
    public CreateClientPortalRfqCommandValidator()
    {
        RuleFor(command => command.ProjectId).NotEmpty();
        RuleFor(command => command.Title).NotEmpty().MaximumLength(256);
        RuleFor(command => command.QuotationDueAtUtc)
            .Must(dueAt => dueAt.ToUniversalTime() > DateTime.UtcNow)
            .WithMessage("Quotation due date must be in the future.");
        RuleFor(command => command.Currency).NotEmpty().Length(3);
        RuleFor(command => command.LineItems).NotEmpty();
        RuleForEach(command => command.LineItems).ChildRules(item =>
        {
            item.RuleFor(line => line.Description).NotEmpty().MaximumLength(2000);
            item.RuleFor(line => line.Quantity).GreaterThan(0);
        });
    }
}
