using System.Globalization;
using Shared;

namespace Application.Meetings;

public static class MeetingDateTimeFormatter
{
    public static string FormatForEmail(DateTime scheduledAtUtc, string? timeZoneId = null)
    {
        DateTime utc = scheduledAtUtc.Kind == DateTimeKind.Utc
            ? scheduledAtUtc
            : scheduledAtUtc.ToUniversalTime();

        TimeZoneInfo timeZone = ResolveTimeZone(timeZoneId);
        DateTime local = TimeZoneInfo.ConvertTimeFromUtc(utc, timeZone);

        string datePart = local.ToString("dddd d MMMM yyyy", CultureInfo.InvariantCulture);
        string timePart = local.Minute == 0
            ? local.ToString("htt", CultureInfo.InvariantCulture).ToLowerInvariant()
            : local.ToString("h:mmtt", CultureInfo.InvariantCulture).ToLowerInvariant();

        return $"{datePart} {timePart}";
    }

    private static TimeZoneInfo ResolveTimeZone(string? timeZoneId)
    {
        string candidate = string.IsNullOrWhiteSpace(timeZoneId)
            ? MeetingTimeZoneDefaults.DefaultId
            : timeZoneId.Trim();

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(candidate);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(MeetingTimeZoneDefaults.DefaultId);
        }
        catch (InvalidTimeZoneException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(MeetingTimeZoneDefaults.DefaultId);
        }
    }
}
