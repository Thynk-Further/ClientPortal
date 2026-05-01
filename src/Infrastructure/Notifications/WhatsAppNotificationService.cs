using Application.Notifications.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Text;

namespace Infrastructure.Notifications;

public sealed class WhatsAppNotificationService : INotificationChannelHandler
{
    private readonly HttpClient _httpClient;
    private readonly TwilioWhatsAppOptions _options;
    private readonly ILogger<WhatsAppNotificationService> _logger;

    public WhatsAppNotificationService(
        HttpClient httpClient,
        IOptions<TwilioWhatsAppOptions> options,
        ILogger<WhatsAppNotificationService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public NotificationChannel Channel => NotificationChannel.WhatsApp;

    public async Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("WhatsApp notifications are disabled. Skipping recipient {Recipient}.", message.Recipient);
            return;
        }

        if (string.IsNullOrWhiteSpace(_options.AccountSid)
            || string.IsNullOrWhiteSpace(_options.AuthToken)
            || string.IsNullOrWhiteSpace(_options.FromNumber))
        {
            _logger.LogWarning("Twilio WhatsApp settings are incomplete. Skipping recipient {Recipient}.", message.Recipient);
            return;
        }

        string accountSid = _options.AccountSid.Trim();
        string basicAuthToken = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{accountSid}:{_options.AuthToken.Trim()}"));
        using HttpRequestMessage request = new(HttpMethod.Post, $"/2010-04-01/Accounts/{Uri.EscapeDataString(accountSid)}/Messages.json")
        {
            Content = new FormUrlEncodedContent(new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["From"] = ToWhatsAppAddress(_options.FromNumber),
                ["To"] = ToWhatsAppAddress(message.Recipient),
                ["Body"] = BuildBody(message)
            })
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuthToken);

        using HttpResponseMessage response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        string body = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogWarning(
            "Twilio WhatsApp API returned {StatusCode} for recipient {Recipient}. Body: {ResponseBody}",
            response.StatusCode,
            message.Recipient,
            body);
    }

    private static string ToWhatsAppAddress(string phoneNumber)
    {
        string trimmed = phoneNumber.Trim();
        return trimmed.StartsWith("whatsapp:", StringComparison.OrdinalIgnoreCase)
            ? trimmed
            : $"whatsapp:{trimmed}";
    }

    private static string BuildBody(NotificationMessage message)
    {
        if (string.IsNullOrWhiteSpace(message.Subject))
        {
            return message.Body;
        }

        return $"{message.Subject}{Environment.NewLine}{message.Body}";
    }
}
