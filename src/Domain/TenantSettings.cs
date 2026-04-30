using Shared;

namespace Domain;

public sealed class TenantSettings : ValueObject
{
    public int MessageRetentionDays { get; }

    public int AttachmentExpiryDays { get; }

    public bool EnableMessageModerationAudit { get; }

    public int OfflineFallbackThresholdSeconds { get; }

    public string BrandColour { get; }

    public string? LogoUrl { get; }

    public string DefaultCurrency { get; }

    public IReadOnlyCollection<string> NotificationChannels { get; }

    public string TaxConfig { get; }

    public TenantSettings(
        int messageRetentionDays,
        int attachmentExpiryDays,
        bool enableMessageModerationAudit,
        int offlineFallbackThresholdSeconds,
        string brandColour,
        string? logoUrl,
        string defaultCurrency,
        IEnumerable<string>? notificationChannels,
        string taxConfig)
    {
        MessageRetentionDays = NormalizePolicyDays(messageRetentionDays, nameof(messageRetentionDays), "MessageRetentionDays");
        AttachmentExpiryDays = NormalizePolicyDays(attachmentExpiryDays, nameof(attachmentExpiryDays), "AttachmentExpiryDays");
        EnableMessageModerationAudit = enableMessageModerationAudit;
        OfflineFallbackThresholdSeconds = NormalizeOfflineThresholdSeconds(offlineFallbackThresholdSeconds);
        BrandColour = Guard.NotEmpty(brandColour, nameof(brandColour)).Trim();
        LogoUrl = string.IsNullOrWhiteSpace(logoUrl) ? null : logoUrl.Trim();
        DefaultCurrency = Guard.NotEmpty(defaultCurrency, nameof(defaultCurrency)).Trim().ToUpperInvariant();
        TaxConfig = Guard.NotEmpty(taxConfig, nameof(taxConfig)).Trim();

        List<string> normalizedChannels = (notificationChannels ?? [])
            .Where(channel => !string.IsNullOrWhiteSpace(channel))
            .Select(channel => channel.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        NotificationChannels = normalizedChannels.AsReadOnly();
    }

    public static TenantSettings Default()
    {
        return new TenantSettings(
            messageRetentionDays: 365,
            attachmentExpiryDays: 90,
            enableMessageModerationAudit: true,
            offlineFallbackThresholdSeconds: 300,
            brandColour: "#2563EB",
            logoUrl: null,
            defaultCurrency: "USD",
            notificationChannels: ["email"],
            taxConfig: "{}");
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return MessageRetentionDays;
        yield return AttachmentExpiryDays;
        yield return EnableMessageModerationAudit;
        yield return OfflineFallbackThresholdSeconds;
        yield return BrandColour;
        yield return LogoUrl;
        yield return DefaultCurrency;

        foreach (string channel in NotificationChannels)
        {
            yield return channel;
        }

        yield return TaxConfig;
    }

    private static int NormalizePolicyDays(int value, string paramName, string propertyName)
    {
        if (value <= 0 || value > 3650)
        {
            throw new ArgumentOutOfRangeException(paramName, $"{propertyName} must be between 1 and 3650 days.");
        }

        return value;
    }

    private static int NormalizeOfflineThresholdSeconds(int value)
    {
        if (value < 0 || value > 86400)
        {
            throw new ArgumentOutOfRangeException(nameof(value), "Offline fallback threshold must be between 0 and 86400 seconds.");
        }

        return value;
    }
}
