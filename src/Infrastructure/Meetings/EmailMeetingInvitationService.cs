using Application.Clients.Abstractions;
using Application.Meetings.Abstractions;
using Application.Notifications.Abstractions;
using Domain;

namespace Infrastructure.Meetings;

public sealed class EmailMeetingInvitationService : IMeetingInvitationService
{
    private readonly IClientRepository _clientRepository;
    private readonly INotificationService _notificationService;

    public EmailMeetingInvitationService(
        IClientRepository clientRepository,
        INotificationService notificationService)
    {
        _clientRepository = clientRepository;
        _notificationService = notificationService;
    }

    public async Task SendMeetingRequestAsync(Meeting meeting, CancellationToken cancellationToken = default)
    {
        Client? client = await _clientRepository.FindByIdAsync(meeting.ClientId, cancellationToken);
        if (client is null)
        {
            return;
        }

        string subject = $"Meeting request: {meeting.Title}";
        string body =
            $"Hello {client.ContactName},\n\n" +
            $"Your business partner has requested a meeting.\n" +
            $"Title: {meeting.Title}\n" +
            $"Proposed time: {meeting.ScheduledAt:yyyy-MM-dd HH:mm:ss} UTC\n" +
            $"Duration: {meeting.DurationMinutes} minutes\n" +
            $"Agenda: {meeting.Description}\n\n" +
            "Please sign in to your client portal to accept or decline this meeting.";

        await _notificationService.SendAsync(
            new NotificationMessage(
                NotificationChannel.Email,
                client.Email.Value,
                subject,
                body),
            cancellationToken);
    }

    public async Task SendCalendarInviteAsync(Meeting meeting, CancellationToken cancellationToken = default)
    {
        Client? client = await _clientRepository.FindByIdAsync(meeting.ClientId, cancellationToken);
        if (client is null)
        {
            return;
        }

        string subject = $"Meeting scheduled: {meeting.Title}";
        string body =
            $"Hello {client.ContactName},\n\n" +
            $"A meeting has been scheduled.\n" +
            $"When: {meeting.ScheduledAt:yyyy-MM-dd HH:mm:ss} UTC\n" +
            $"Duration: {meeting.DurationMinutes} minutes\n" +
            $"Join link: {meeting.MeetingUrl}\n\n" +
            "A calendar invite is attached.";

        string icsContent = BuildIcs(meeting);
        Dictionary<string, string> metadata = new(StringComparer.Ordinal)
        {
            ["attachment.fileName"] = $"meeting-{meeting.Id}.ics",
            ["attachment.contentType"] = "text/calendar; charset=utf-8; method=REQUEST",
            ["attachment.base64"] = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(icsContent))
        };

        await _notificationService.SendAsync(
            new NotificationMessage(
                NotificationChannel.Email,
                client.Email.Value,
                subject,
                body,
                metadata),
            cancellationToken);
    }

    private static string BuildIcs(Meeting meeting)
    {
        DateTime startUtc = meeting.ScheduledAt.Kind == DateTimeKind.Utc
            ? meeting.ScheduledAt
            : meeting.ScheduledAt.ToUniversalTime();
        DateTime endUtc = startUtc.AddMinutes(meeting.DurationMinutes);
        string nowUtc = DateTime.UtcNow.ToString("yyyyMMdd'T'HHmmss'Z'", System.Globalization.CultureInfo.InvariantCulture);

        return string.Join("\r\n",
        [
            "BEGIN:VCALENDAR",
            "PRODID:-//ClientPortal//Meeting Invite//EN",
            "VERSION:2.0",
            "CALSCALE:GREGORIAN",
            "METHOD:REQUEST",
            "BEGIN:VEVENT",
            $"UID:{meeting.Id}@clientportal.local",
            $"DTSTAMP:{nowUtc}",
            $"DTSTART:{startUtc.ToString("yyyyMMdd'T'HHmmss'Z'", System.Globalization.CultureInfo.InvariantCulture)}",
            $"DTEND:{endUtc.ToString("yyyyMMdd'T'HHmmss'Z'", System.Globalization.CultureInfo.InvariantCulture)}",
            $"SUMMARY:{EscapeIcsText(meeting.Title)}",
            $"DESCRIPTION:{EscapeIcsText(meeting.Description)}\\nJoin: {EscapeIcsText(meeting.MeetingUrl)}",
            $"LOCATION:{EscapeIcsText(meeting.MeetingUrl)}",
            "STATUS:CONFIRMED",
            "END:VEVENT",
            "END:VCALENDAR",
            string.Empty
        ]);
    }

    private static string EscapeIcsText(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        return value
            .Trim()
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace(";", "\\;", StringComparison.Ordinal)
            .Replace(",", "\\,", StringComparison.Ordinal)
            .Replace("\r\n", "\\n", StringComparison.Ordinal)
            .Replace("\n", "\\n", StringComparison.Ordinal)
            .Replace("\r", "\\n", StringComparison.Ordinal);
    }
}
