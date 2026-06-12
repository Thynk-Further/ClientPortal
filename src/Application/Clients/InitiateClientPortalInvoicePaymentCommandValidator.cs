using FluentValidation;

namespace Application.Clients;

public sealed class InitiateClientPortalInvoicePaymentCommandValidator
    : AbstractValidator<InitiateClientPortalInvoicePaymentCommand>
{
    public InitiateClientPortalInvoicePaymentCommandValidator()
    {
        RuleFor(command => command.InvoiceId)
            .NotEmpty();

        RuleFor(command => command.CallbackUrl)
            .NotEmpty()
            .Must(BeAbsoluteHttpUri)
            .WithMessage("Callback URL must be an absolute HTTP or HTTPS URL.");

        RuleFor(command => command.Provider)
            .MaximumLength(50)
            .When(command => !string.IsNullOrWhiteSpace(command.Provider));
    }

    private static bool BeAbsoluteHttpUri(string callbackUrl)
    {
        return Uri.TryCreate(callbackUrl, UriKind.Absolute, out Uri? uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }
}
