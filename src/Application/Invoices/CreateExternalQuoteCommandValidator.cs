using FluentValidation;

namespace Application.Invoices;

public sealed class CreateExternalQuoteCommandValidator : AbstractValidator<CreateExternalQuoteCommand>
{
    public CreateExternalQuoteCommandValidator()
    {
        RuleFor(command => command.QuoteNumber).NotEmpty().MaximumLength(128);
        RuleFor(command => command.Currency).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
        RuleFor(command => command.DueDate).NotEqual(default(DateOnly));
        RuleFor(command => command.RecipientCompanyName).NotEmpty().MaximumLength(512);
        RuleFor(command => command.RecipientContactName).MaximumLength(256);
        RuleFor(command => command.RecipientEmail).MaximumLength(320);
        RuleFor(command => command.RecipientPhone).MaximumLength(64);
        RuleFor(command => command.LineItems).NotNull().Must(items => items.Count > 0);
        RuleForEach(command => command.LineItems).SetValidator(new CreateInvoiceLineItemInputValidator());
    }

    private sealed class CreateInvoiceLineItemInputValidator : AbstractValidator<CreateInvoiceLineItemInput>
    {
        public CreateInvoiceLineItemInputValidator()
        {
            RuleFor(item => item.Description).NotEmpty().MaximumLength(512);
            RuleFor(item => item.Quantity).GreaterThan(0m);
            RuleFor(item => item.UnitPrice).GreaterThan(0m);
            RuleFor(item => item.TaxRate).InclusiveBetween(0m, 1m);
        }
    }
}
