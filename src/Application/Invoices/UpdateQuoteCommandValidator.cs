using FluentValidation;

namespace Application.Invoices;

public sealed class UpdateQuoteCommandValidator : AbstractValidator<UpdateQuoteCommand>
{
    public UpdateQuoteCommandValidator()
    {
        RuleFor(command => command.QuoteId).NotEmpty();
        RuleFor(command => command.ClientId).NotEmpty();
        RuleFor(command => command.QuoteNumber).NotEmpty().MaximumLength(128);
        RuleFor(command => command.Currency).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
        RuleFor(command => command.DueDate).NotEqual(default(DateOnly));
        RuleFor(command => command.LineItems).NotNull().Must(items => items.Count > 0);
        RuleForEach(command => command.LineItems).SetValidator(new UpdateQuoteLineItemInputValidator());
    }

    private sealed class UpdateQuoteLineItemInputValidator : AbstractValidator<CreateInvoiceLineItemInput>
    {
        public UpdateQuoteLineItemInputValidator()
        {
            RuleFor(item => item.Description).NotEmpty().MaximumLength(512);
            RuleFor(item => item.Quantity).GreaterThan(0m);
            RuleFor(item => item.UnitPrice).GreaterThanOrEqualTo(0m);
            RuleFor(item => item.TaxRate).InclusiveBetween(0m, 1m);
        }
    }
}
