using FluentValidation;

namespace Application.Invoices;

public sealed class CreateQuoteCommandValidator : AbstractValidator<CreateQuoteCommand>
{
    public CreateQuoteCommandValidator()
    {
        RuleFor(command => command.ClientId).NotEmpty();
        RuleFor(command => command.ProjectId).NotEmpty();
        RuleFor(command => command.QuoteNumber).NotEmpty().MaximumLength(128);
        RuleFor(command => command.Currency).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
        RuleFor(command => command.DueDate).NotEqual(default(DateOnly));
        RuleFor(command => command.LineItems).NotNull().Must(items => items.Count > 0);
        RuleForEach(command => command.LineItems).SetValidator(new CreateInvoiceLineItemInputValidator());
    }

    private sealed class CreateInvoiceLineItemInputValidator : AbstractValidator<CreateInvoiceLineItemInput>
    {
        public CreateInvoiceLineItemInputValidator()
        {
            RuleFor(item => item.Description).NotEmpty().MaximumLength(512);
            RuleFor(item => item.Quantity).GreaterThan(0m);
            RuleFor(item => item.UnitPrice).GreaterThanOrEqualTo(0m);
            RuleFor(item => item.TaxRate).InclusiveBetween(0m, 1m);
        }
    }
}
