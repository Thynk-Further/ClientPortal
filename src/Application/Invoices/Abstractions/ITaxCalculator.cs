using Domain;

namespace Application.Invoices.Abstractions;

public interface ITaxCalculator
{
    decimal ResolveDefaultRate(TenantSettings? tenantSettings);

    TaxPricingMode ResolvePricingMode(TenantSettings? tenantSettings);
}
