namespace Infrastructure.Notifications;

public sealed class TwilioWhatsAppOptions
{
    public const string SectionName = "Notifications:WhatsApp";

    public bool Enabled { get; set; } = false;

    public string BaseUrl { get; set; } = "https://api.twilio.com";

    public string AccountSid { get; set; } = string.Empty;

    public string AuthToken { get; set; } = string.Empty;

    public string FromNumber { get; set; } = string.Empty;
}
