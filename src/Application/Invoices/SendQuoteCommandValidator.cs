using FluentValidation;

namespace Application.Invoices;

public sealed class SendQuoteCommandValidator : AbstractValidator<SendQuoteCommand>
{
    public SendQuoteCommandValidator()
    {
        RuleFor(command => command.QuoteId).NotEmpty();
        RuleFor(command => command.ClientId).NotEmpty();
    }
}
