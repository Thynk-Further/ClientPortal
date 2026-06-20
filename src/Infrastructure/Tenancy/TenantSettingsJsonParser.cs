using System.Text.Json;
using System.Text.Json.Serialization;
using Domain;

namespace Infrastructure.Tenancy;

public static class TenantSettingsJsonParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public static string ToJson(TenantSettings settings)
    {
        ArgumentNullException.ThrowIfNull(settings);

        TenantSettingsPayload payload = new()
        {
            MessageRetentionDays = settings.MessageRetentionDays,
            AttachmentExpiryDays = settings.AttachmentExpiryDays,
            EnableMessageModerationAudit = settings.EnableMessageModerationAudit,
            OfflineFallbackThresholdSeconds = settings.OfflineFallbackThresholdSeconds,
            BrandColour = settings.BrandColour,
            LogoUrl = settings.LogoUrl,
            DefaultCurrency = settings.DefaultCurrency,
            NotificationChannels = settings.NotificationChannels.ToList(),
            TaxConfig = settings.TaxConfig,
        };

        return JsonSerializer.Serialize(payload, JsonOptions);
    }

    public static TenantSettings Parse(string? settingsJson)
    {
        if (string.IsNullOrWhiteSpace(settingsJson))
        {
            return TenantSettings.Default();
        }

        try
        {
            TenantSettingsPayload? payload = JsonSerializer.Deserialize<TenantSettingsPayload>(settingsJson, JsonOptions);
            if (payload is null)
            {
                return TenantSettings.Default();
            }

            return new TenantSettings(
                payload.MessageRetentionDays,
                payload.AttachmentExpiryDays,
                payload.EnableMessageModerationAudit,
                payload.OfflineFallbackThresholdSeconds,
                string.IsNullOrWhiteSpace(payload.BrandColour) ? "#2563EB" : payload.BrandColour,
                payload.LogoUrl,
                string.IsNullOrWhiteSpace(payload.DefaultCurrency) ? "USD" : payload.DefaultCurrency,
                payload.NotificationChannels,
                string.IsNullOrWhiteSpace(payload.TaxConfig) ? "{}" : payload.TaxConfig);
        }
        catch (JsonException)
        {
            return TenantSettings.Default();
        }
    }

    private sealed class TenantSettingsPayload
    {
        public int MessageRetentionDays { get; set; } = 365;

        public int AttachmentExpiryDays { get; set; } = 90;

        public bool EnableMessageModerationAudit { get; set; } = true;

        public int OfflineFallbackThresholdSeconds { get; set; } = 300;

        public string BrandColour { get; set; } = "#2563EB";

        public string? LogoUrl { get; set; }

        public string DefaultCurrency { get; set; } = "USD";

        public List<string>? NotificationChannels { get; set; }

        public string TaxConfig { get; set; } = "{}";

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? ExtensionData { get; set; }
    }
}
