using FluentValidation;

namespace Application.Tenancy;

public sealed class UpdateTenantTaxConfigCommandValidator : AbstractValidator<UpdateTenantTaxConfigCommand>
{
    public UpdateTenantTaxConfigCommandValidator()
    {
        RuleFor(command => command.Label).NotEmpty().MaximumLength(64);
        RuleFor(command => command.TaxPercentage).InclusiveBetween(0m, 100m);
        RuleFor(command => command.RegistrationNumber).NotEmpty().MaximumLength(128);
        RuleFor(command => command.Notes).MaximumLength(2000);
        RuleFor(command => command.CountryCode).MaximumLength(2);
        RuleFor(command => command.PricingMode)
            .NotEmpty()
            .Must(mode => mode.Equals("exclusive", StringComparison.OrdinalIgnoreCase)
                || mode.Equals("inclusive", StringComparison.OrdinalIgnoreCase))
            .WithMessage("Pricing mode must be exclusive or inclusive.");
    }
}
