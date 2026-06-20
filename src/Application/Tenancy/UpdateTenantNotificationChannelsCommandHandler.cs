using Application.Abstractions;
using Application.Tenancy.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed class UpdateTenantNotificationChannelsCommandHandler
    : IRequestHandler<UpdateTenantNotificationChannelsCommand, Result<TenantNotificationChannelsDto>>
{
    private static readonly Error TenantNotResolvedError = new(
        "Tenant.Unresolved",
        "Tenant could not be resolved.",
        ErrorType.NotFound);

    private readonly ICurrentTenant _currentTenant;
    private readonly IPublicTenantRepository _publicTenantRepository;

    public UpdateTenantNotificationChannelsCommandHandler(
        ICurrentTenant currentTenant,
        IPublicTenantRepository publicTenantRepository)
    {
        _currentTenant = currentTenant;
        _publicTenantRepository = publicTenantRepository;
    }

    public async Task<Result<TenantNotificationChannelsDto>> Handle(
        UpdateTenantNotificationChannelsCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Result<TenantNotificationChannelsDto>.Failure(TenantNotResolvedError);
        }

        PublicTenantRecord? tenant = await _publicTenantRepository.GetBySlugAsync(
            _currentTenant.Slug,
            cancellationToken);

        if (tenant is null || !tenant.IsActive)
        {
            return Result<TenantNotificationChannelsDto>.Failure(TenantNotResolvedError);
        }

        List<string> channels = [];
        if (request.EmailEnabled)
        {
            channels.Add("email");
        }

        if (request.InAppEnabled)
        {
            channels.Add("in_app");
        }

        if (request.SmsEnabled)
        {
            channels.Add("sms");
        }

        if (request.WeeklyDigestEnabled)
        {
            channels.Add("weekly_digest");
        }

        TenantSettings currentSettings = tenant.Settings;
        TenantSettings updatedSettings = new(
            messageRetentionDays: currentSettings.MessageRetentionDays,
            attachmentExpiryDays: currentSettings.AttachmentExpiryDays,
            enableMessageModerationAudit: currentSettings.EnableMessageModerationAudit,
            offlineFallbackThresholdSeconds: currentSettings.OfflineFallbackThresholdSeconds,
            brandColour: currentSettings.BrandColour,
            logoUrl: currentSettings.LogoUrl,
            defaultCurrency: currentSettings.DefaultCurrency,
            notificationChannels: channels,
            taxConfig: currentSettings.TaxConfig);

        await _publicTenantRepository.UpdateSettingsAsync(tenant.Id, updatedSettings, cancellationToken);

        TenantNotificationChannelsDto result = new(
            request.EmailEnabled,
            request.InAppEnabled,
            request.SmsEnabled,
            request.WeeklyDigestEnabled);

        return Result<TenantNotificationChannelsDto>.Success(result);
    }
}
