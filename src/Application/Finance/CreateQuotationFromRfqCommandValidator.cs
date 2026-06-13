using Application.Invoices;
using FluentValidation;

namespace Application.Finance;

public sealed class CreateQuotationFromRfqCommandValidator : AbstractValidator<CreateQuotationFromRfqCommand>
{
    public CreateQuotationFromRfqCommandValidator()
    {
        RuleFor(command => command.RfqId).NotEmpty();
        RuleFor(command => command.ClientId).NotEmpty();
        RuleFor(command => command.QuoteNumber).NotEmpty().MaximumLength(64);
        RuleFor(command => command.DueDate).NotEqual(default(DateOnly));
        RuleFor(command => command.LineItems).NotNull().Must(items => items.Count > 0);
        RuleForEach(command => command.LineItems).ChildRules(item =>
        {
            item.RuleFor(line => line.Description).NotEmpty().MaximumLength(512);
            item.RuleFor(line => line.Quantity).GreaterThan(0m);
            item.RuleFor(line => line.UnitPrice).GreaterThan(0m);
            item.RuleFor(line => line.TaxRate).InclusiveBetween(0m, 1m);
        });
    }
}
