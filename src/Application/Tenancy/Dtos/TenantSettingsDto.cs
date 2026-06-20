namespace Application.Tenancy.Dtos;

public sealed record TenantSettingsDto(
    string TenantName,
    string BrandColour,
    string? LogoUrl,
    TenantTaxSettingsDto Tax,
    TenantNotificationChannelsDto Notifications);

public sealed record TenantTaxSettingsDto(
    string Label,
    decimal TaxPercentage,
    string RegistrationNumber,
    string Notes,
    string CountryCode,
    string PricingMode);

public sealed record TenantNotificationChannelsDto(
    bool EmailEnabled,
    bool InAppEnabled,
    bool SmsEnabled,
    bool WeeklyDigestEnabled);

public sealed record TenantBrandingUpdateResultDto(
    string BrandColour,
    string? LogoUrl);

public sealed record TenantLogoUploadUrlResultDto(
    string UploadUrl,
    string LogoUrl,
    DateTime ExpiresAtUtc);
