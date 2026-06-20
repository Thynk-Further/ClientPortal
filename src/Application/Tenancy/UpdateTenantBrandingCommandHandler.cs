using Application.Abstractions;
using Application.Tenancy.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed class UpdateTenantBrandingCommandHandler
    : IRequestHandler<UpdateTenantBrandingCommand, Result<TenantBrandingUpdateResultDto>>
{
    private static readonly Error TenantNotResolvedError = new(
        "Tenant.Unresolved",
        "Tenant could not be resolved.",
        ErrorType.NotFound);

    private readonly ICurrentTenant _currentTenant;
    private readonly IPublicTenantRepository _publicTenantRepository;

    public UpdateTenantBrandingCommandHandler(
        ICurrentTenant currentTenant,
        IPublicTenantRepository publicTenantRepository)
    {
        _currentTenant = currentTenant;
        _publicTenantRepository = publicTenantRepository;
    }

    public async Task<Result<TenantBrandingUpdateResultDto>> Handle(
        UpdateTenantBrandingCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Result<TenantBrandingUpdateResultDto>.Failure(TenantNotResolvedError);
        }

        PublicTenantRecord? tenant = await _publicTenantRepository.GetBySlugAsync(
            _currentTenant.Slug,
            cancellationToken);

        if (tenant is null || !tenant.IsActive)
        {
            return Result<TenantBrandingUpdateResultDto>.Failure(TenantNotResolvedError);
        }

        TenantSettings currentSettings = tenant.Settings;
        TenantSettings updatedSettings = new(
            messageRetentionDays: currentSettings.MessageRetentionDays,
            attachmentExpiryDays: currentSettings.AttachmentExpiryDays,
            enableMessageModerationAudit: currentSettings.EnableMessageModerationAudit,
            offlineFallbackThresholdSeconds: currentSettings.OfflineFallbackThresholdSeconds,
            brandColour: request.BrandColour.Trim(),
            logoUrl: request.LogoUrl,
            defaultCurrency: currentSettings.DefaultCurrency,
            notificationChannels: currentSettings.NotificationChannels,
            taxConfig: currentSettings.TaxConfig);

        await _publicTenantRepository.UpdateSettingsAsync(tenant.Id, updatedSettings, cancellationToken);

        TenantBrandingUpdateResultDto result = new(
            updatedSettings.BrandColour,
            updatedSettings.LogoUrl);

        return Result<TenantBrandingUpdateResultDto>.Success(result);
    }
}
