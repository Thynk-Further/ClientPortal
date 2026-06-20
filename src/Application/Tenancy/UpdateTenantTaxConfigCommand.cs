using Application.Tenancy.Dtos;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed record UpdateTenantTaxConfigCommand(
    string Label,
    decimal TaxPercentage,
    string RegistrationNumber,
    string Notes,
    string CountryCode,
    string PricingMode) : IRequest<Result<TenantTaxSettingsDto>>;
