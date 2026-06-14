using Application.Meetings.Abstractions;
using Application.Notifications.Abstractions;
using Microsoft.Extensions.Logging;

namespace Application.Meetings;

public sealed class MeetingReminderJob
{
    private readonly IMeetingReminderReader _meetingReminderReader;
    private readonly INotificationService _notificationService;
    private readonly ILogger<MeetingReminderJob> _logger;

    public MeetingReminderJob(
        IMeetingReminderReader meetingReminderReader,
        INotificationService notificationService,
        ILogger<MeetingReminderJob> logger)
    {
        _meetingReminderReader = meetingReminderReader;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task RunAsync(CancellationToken cancellationToken)
    {
        DateTime nowUtc = DateTime.UtcNow;
        IReadOnlyList<MeetingReminderItem> reminders = await _meetingReminderReader
            .GetPendingRemindersAsync(nowUtc, cancellationToken);

        foreach (MeetingReminderItem reminder in reminders)
        {
            await SendEmailReminderAsync(reminder, cancellationToken);
            await SendWhatsAppReminderAsync(reminder, cancellationToken);
        }

        _logger.LogInformation(
            "MeetingReminderJob processed {Count} reminders at {NowUtc}.",
            reminders.Count,
            nowUtc);
    }

    private async Task SendEmailReminderAsync(MeetingReminderItem reminder, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(reminder.ClientEmail))
        {
            _logger.LogWarning(
                "Skipping meeting email reminder for meeting {MeetingId} in tenant {TenantSlug}: missing email.",
                reminder.MeetingId,
                reminder.TenantSlug);
            return;
        }

        string leadTimeText = reminder.LeadTime switch
        {
            MeetingReminderLeadTime.OneDay => "24 hours",
            MeetingReminderLeadTime.OneHour => "1 hour",
            MeetingReminderLeadTime.FifteenMinutes => "15 minutes",
            _ => "soon"
        };
        string subject = $"Meeting reminder: {reminder.MeetingTitle} in {leadTimeText}";
        string body =
            $"Hello {reminder.ClientContactName},\n\n" +
            $"This is a reminder for your meeting \"{reminder.MeetingTitle}\".\n" +
            $"Starts at: {reminder.ScheduledAtUtc:yyyy-MM-dd HH:mm} UTC\n" +
            $"Meeting link: {reminder.MeetingUrl}\n\n" +
            $"Reminder window: {leadTimeText} before start.";

        try
        {
            await _notificationService.SendAsync(
                new NotificationMessage(
                    NotificationChannel.Email,
                    reminder.ClientEmail,
                    subject,
                    body),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to send meeting email reminder for meeting {MeetingId} in tenant {TenantSlug}.",
                reminder.MeetingId,
                reminder.TenantSlug);
        }
    }

    private async Task SendWhatsAppReminderAsync(MeetingReminderItem reminder, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(reminder.ClientPhone))
        {
            _logger.LogWarning(
                "Skipping meeting WhatsApp reminder for meeting {MeetingId} in tenant {TenantSlug}: missing phone.",
                reminder.MeetingId,
                reminder.TenantSlug);
            return;
        }

        string leadTimeText = reminder.LeadTime switch
        {
            MeetingReminderLeadTime.OneDay => "24h",
            MeetingReminderLeadTime.OneHour => "1h",
            MeetingReminderLeadTime.FifteenMinutes => "15m",
            _ => "soon"
        };
        string subject = $"Meeting reminder ({leadTimeText})";
        string body =
            $"Reminder: \"{reminder.MeetingTitle}\" starts at {reminder.ScheduledAtUtc:yyyy-MM-dd HH:mm} UTC. " +
            $"Join: {reminder.MeetingUrl}";

        try
        {
            await _notificationService.SendAsync(
                new NotificationMessage(
                    NotificationChannel.WhatsApp,
                    reminder.ClientPhone,
                    subject,
                    body),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to send meeting WhatsApp reminder for meeting {MeetingId} in tenant {TenantSlug}.",
                reminder.MeetingId,
                reminder.TenantSlug);
        }
    }
}
