using FluentValidation;

namespace Application.Clients;

public sealed class VerifyClientPortalInvoicePaymentCommandValidator
    : AbstractValidator<VerifyClientPortalInvoicePaymentCommand>
{
    public VerifyClientPortalInvoicePaymentCommandValidator()
    {
        RuleFor(command => command.InvoiceId)
            .NotEmpty();

        RuleFor(command => command.Provider)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(command => command.TransactionId)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(command => command.Reference)
            .NotEmpty()
            .MaximumLength(200);
    }
}
