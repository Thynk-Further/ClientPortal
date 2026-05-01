using Application.Abstractions;
using Application.Notifications.Abstractions;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Net;

namespace Infrastructure.Notifications;

public sealed class EmailNotificationService : INotificationChannelHandler
{
    private const string EmailTemplate =
        """
        <!doctype html>
        <html>
        <body style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
            <div style="padding:16px 20px;background:{{BrandColour}};color:#ffffff;">
              {{!LogoHtml}}
              <h2 style="margin:8px 0 0 0;font-size:20px;">{{Subject}}</h2>
            </div>
            <div style="padding:20px;color:#0f172a;line-height:1.5;">
              {{!BodyHtml}}
            </div>
          </div>
        </body>
        </html>
        """;

    private readonly EmailNotificationOptions _options;
    private readonly ICurrentTenant _currentTenant;
    private readonly INotificationTemplateEngine _templateEngine;
    private readonly ILogger<EmailNotificationService> _logger;

    public EmailNotificationService(
        IOptions<EmailNotificationOptions> options,
        ICurrentTenant currentTenant,
        INotificationTemplateEngine templateEngine,
        ILogger<EmailNotificationService> logger)
    {
        _options = options.Value;
        _currentTenant = currentTenant;
        _templateEngine = templateEngine;
        _logger = logger;
    }

    public NotificationChannel Channel => NotificationChannel.Email;

    public async Task SendAsync(NotificationMessage message, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Email notifications are disabled. Skipping recipient {Recipient}.", message.Recipient);
            return;
        }

        MimeMessage email = BuildEmailMessage(message);
        using SmtpClient smtpClient = new();
        await smtpClient.ConnectAsync(
            _options.SmtpHost,
            _options.SmtpPort,
            _options.UseSsl ? SecureSocketOptions.SslOnConnect : SecureSocketOptions.StartTls,
            cancellationToken);

        if (!string.IsNullOrWhiteSpace(_options.Username))
        {
            await smtpClient.AuthenticateAsync(_options.Username, _options.Password, cancellationToken);
        }

        await smtpClient.SendAsync(email, cancellationToken);
        await smtpClient.DisconnectAsync(true, cancellationToken);
    }

    private MimeMessage BuildEmailMessage(NotificationMessage message)
    {
        MimeMessage email = new();
        email.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        email.To.Add(MailboxAddress.Parse(message.Recipient));
        email.Subject = message.Subject;

        string html = BuildBrandedHtmlBody(message.Subject, message.Body);
        email.Body = new BodyBuilder
        {
            HtmlBody = html,
            TextBody = message.Body
        }.ToMessageBody();

        return email;
    }

    private string BuildBrandedHtmlBody(string subject, string body)
    {
        string brandColour = _currentTenant.Settings?.BrandColour ?? "#2563EB";
        string? logoUrl = _currentTenant.Settings?.LogoUrl;

        string encodedBody = WebUtility.HtmlEncode(body).Replace("\n", "<br/>", StringComparison.Ordinal);
        string logoHtml = string.IsNullOrWhiteSpace(logoUrl)
            ? string.Empty
            : $"""<img src="{WebUtility.HtmlEncode(logoUrl)}" alt="Tenant logo" style="max-height:48px;" />""";

        Dictionary<string, string> bindings = new(StringComparer.Ordinal)
        {
            ["BrandColour"] = brandColour,
            ["LogoHtml"] = logoHtml,
            ["Subject"] = subject,
            ["BodyHtml"] = encodedBody
        };

        return _templateEngine.RenderHtml(EmailTemplate, bindings);
    }
}
