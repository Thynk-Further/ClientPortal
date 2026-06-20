using Application.Abstractions;
using Application.Tenancy.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed class UpdateTenantTaxConfigCommandHandler
    : IRequestHandler<UpdateTenantTaxConfigCommand, Result<TenantTaxSettingsDto>>
{
    private static readonly Error TenantNotResolvedError = new(
        "Tenant.Unresolved",
        "Tenant could not be resolved.",
        ErrorType.NotFound);

    private readonly ICurrentTenant _currentTenant;
    private readonly IPublicTenantRepository _publicTenantRepository;

    public UpdateTenantTaxConfigCommandHandler(
        ICurrentTenant currentTenant,
        IPublicTenantRepository publicTenantRepository)
    {
        _currentTenant = currentTenant;
        _publicTenantRepository = publicTenantRepository;
    }

    public async Task<Result<TenantTaxSettingsDto>> Handle(
        UpdateTenantTaxConfigCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Result<TenantTaxSettingsDto>.Failure(TenantNotResolvedError);
        }

        PublicTenantRecord? tenant = await _publicTenantRepository.GetBySlugAsync(
            _currentTenant.Slug,
            cancellationToken);

        if (tenant is null || !tenant.IsActive)
        {
            return Result<TenantTaxSettingsDto>.Failure(TenantNotResolvedError);
        }

        TaxPricingMode pricingMode = request.PricingMode.Equals("inclusive", StringComparison.OrdinalIgnoreCase)
            ? TaxPricingMode.Inclusive
            : TaxPricingMode.Exclusive;

        TaxConfiguration taxConfiguration = new(
            request.Label,
            request.TaxPercentage / 100m,
            request.RegistrationNumber,
            request.Notes,
            request.CountryCode,
            pricingMode);

        TenantSettings currentSettings = tenant.Settings;
        TenantSettings updatedSettings = new(
            messageRetentionDays: currentSettings.MessageRetentionDays,
            attachmentExpiryDays: currentSettings.AttachmentExpiryDays,
            enableMessageModerationAudit: currentSettings.EnableMessageModerationAudit,
            offlineFallbackThresholdSeconds: currentSettings.OfflineFallbackThresholdSeconds,
            brandColour: currentSettings.BrandColour,
            logoUrl: currentSettings.LogoUrl,
            defaultCurrency: currentSettings.DefaultCurrency,
            notificationChannels: currentSettings.NotificationChannels,
            taxConfig: taxConfiguration.ToJson());

        await _publicTenantRepository.UpdateSettingsAsync(tenant.Id, updatedSettings, cancellationToken);

        TenantTaxSettingsDto result = new(
            taxConfiguration.Label,
            decimal.Round(taxConfiguration.Rate * 100m, 2, MidpointRounding.ToEven),
            taxConfiguration.RegistrationNumber,
            taxConfiguration.Notes,
            taxConfiguration.CountryCode,
            taxConfiguration.PricingMode.ToString());

        return Result<TenantTaxSettingsDto>.Success(result);
    }
}
