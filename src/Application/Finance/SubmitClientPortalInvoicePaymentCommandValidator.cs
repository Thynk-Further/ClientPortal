using FluentValidation;

namespace Application.Finance;

public sealed class SubmitClientPortalInvoicePaymentCommandValidator
    : AbstractValidator<SubmitClientPortalInvoicePaymentCommand>
{
    public SubmitClientPortalInvoicePaymentCommandValidator()
    {
        RuleFor(command => command.InvoiceId).NotEmpty();
        RuleFor(command => command.Amount).GreaterThan(0);
        RuleFor(command => command.Currency).NotEmpty().Length(3);
        RuleFor(command => command.Method).NotEmpty().MaximumLength(128);
        RuleFor(command => command.Reference).NotEmpty().MaximumLength(256);
        RuleFor(command => command.ProofDocumentId).NotEmpty();
    }
}
