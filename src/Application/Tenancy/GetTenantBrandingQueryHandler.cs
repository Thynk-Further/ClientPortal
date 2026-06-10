using Application.Abstractions;
using Application.Tenancy.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed class GetTenantBrandingQueryHandler : IRequestHandler<GetTenantBrandingQuery, Result<TenantBrandingDto>>
{
    private static readonly Error TenantNotResolvedError = new(
        "Tenant.Unresolved",
        "Tenant could not be resolved for branding.",
        ErrorType.NotFound);

    private readonly ICurrentTenant _currentTenant;
    private readonly ITenantPublicRecordLookup _tenantPublicRecordLookup;

    public GetTenantBrandingQueryHandler(
        ICurrentTenant currentTenant,
        ITenantPublicRecordLookup tenantPublicRecordLookup)
    {
        _currentTenant = currentTenant;
        _tenantPublicRecordLookup = tenantPublicRecordLookup;
    }

    public async Task<Result<TenantBrandingDto>> Handle(
        GetTenantBrandingQuery request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Result<TenantBrandingDto>.Failure(TenantNotResolvedError);
        }

        TenantPublicRecord? tenant = await _tenantPublicRecordLookup.FindBySlugAsync(
            _currentTenant.Slug,
            cancellationToken);

        if (tenant is null || !tenant.IsActive)
        {
            return Result<TenantBrandingDto>.Failure(TenantNotResolvedError);
        }

        PlanFeatureFlags featureFlags = tenant.Plan.GetFeatureFlags();
        string brandColour = tenant.Settings.BrandColour;
        IReadOnlyDictionary<string, string> cssVariables = TenantBrandingCssVariables.Create(brandColour);

        TenantBrandingDto branding = new(
            tenant.Id,
            tenant.Name,
            tenant.Slug,
            tenant.Settings.LogoUrl,
            brandColour,
            tenant.Domain,
            featureFlags.CustomDomainEnabled,
            cssVariables);

        return Result<TenantBrandingDto>.Success(branding);
    }
}
