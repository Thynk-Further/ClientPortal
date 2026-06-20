using Application.Invoices.Abstractions;
using Application.Tenancy;
using Domain;

namespace Application.Invoices;

public sealed class TenantTaxCalculator : ITaxCalculator
{
    private const decimal ZaVatRate = 0.15m;

    public decimal ResolveDefaultRate(TenantSettings? tenantSettings)
    {
        if (tenantSettings is null || string.IsNullOrWhiteSpace(tenantSettings.TaxConfig))
        {
            return 0m;
        }

        TaxConfiguration taxConfiguration = TaxConfiguration.Parse(tenantSettings.TaxConfig);
        if (taxConfiguration.Rate > 0m)
        {
            return taxConfiguration.Rate;
        }

        string countryCode = taxConfiguration.CountryCode;
        return ResolveRegionalDefaultRate(countryCode);
    }

    public TaxPricingMode ResolvePricingMode(TenantSettings? tenantSettings)
    {
        if (tenantSettings is null || string.IsNullOrWhiteSpace(tenantSettings.TaxConfig))
        {
            return TaxPricingMode.Exclusive;
        }

        return TaxConfiguration.Parse(tenantSettings.TaxConfig).PricingMode;
    }

    private static decimal ResolveRegionalDefaultRate(string countryCode)
    {
        return countryCode switch
        {
            "ZA" => ZaVatRate,
            "ZW" => 0m,
            "ZM" => 0m,
            _ => 0m,
        };
    }
}
