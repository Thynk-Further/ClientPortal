using FluentValidation;

namespace Application.Tenancy;

public sealed class UpdateTenantBrandingCommandValidator : AbstractValidator<UpdateTenantBrandingCommand>
{
    public UpdateTenantBrandingCommandValidator()
    {
        RuleFor(command => command.BrandColour)
            .NotEmpty()
            .Must(IsValidHexColour)
            .WithMessage("Brand colour must be a valid hex colour (#RGB or #RRGGBB).");

        RuleFor(command => command.LogoUrl)
            .Must(url => url is null || Uri.TryCreate(url, UriKind.Absolute, out Uri? parsed) && parsed.Scheme == Uri.UriSchemeHttps)
            .WithMessage("Logo URL must be a valid HTTPS URL.");
    }

    private static bool IsValidHexColour(string colour)
    {
        if (string.IsNullOrWhiteSpace(colour))
        {
            return false;
        }

        string normalized = colour.Trim();
        if (normalized.Length is not (4 or 7) || normalized[0] != '#')
        {
            return false;
        }

        return normalized[1..].All(static ch => char.IsAsciiHexDigit(ch));
    }
}
