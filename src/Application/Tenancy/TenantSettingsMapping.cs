using Application.Abstractions;
using Application.Tenancy.Dtos;
using Domain;
using Shared;

namespace Application.Tenancy;

internal static class TenantSettingsMapping
{
    public static TenantSettingsDto Map(PublicTenantRecord tenant)
    {
        TaxConfiguration tax = TaxConfiguration.Parse(tenant.Settings.TaxConfig);
        IReadOnlyCollection<string> channels = tenant.Settings.NotificationChannels;

        return new TenantSettingsDto(
            tenant.Name,
            tenant.Settings.BrandColour,
            tenant.Settings.LogoUrl,
            new TenantTaxSettingsDto(
                tax.Label,
                decimal.Round(tax.Rate * 100m, 2, MidpointRounding.ToEven),
                tax.RegistrationNumber,
                tax.Notes,
                tax.CountryCode,
                tax.PricingMode.ToString()),
            new TenantNotificationChannelsDto(
                channels.Contains("email", StringComparer.OrdinalIgnoreCase),
                channels.Contains("in_app", StringComparer.OrdinalIgnoreCase),
                channels.Contains("sms", StringComparer.OrdinalIgnoreCase),
                channels.Contains("weekly_digest", StringComparer.OrdinalIgnoreCase)));
    }
}
