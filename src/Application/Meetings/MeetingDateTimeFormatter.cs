using System.Globalization;
using Shared;

namespace Application.Meetings;

public static class MeetingDateTimeFormatter
{
    public static string FormatDateForEmail(DateTime scheduledAtUtc, string? timeZoneId = null)
    {
        DateTime local = ToLocalScheduledTime(scheduledAtUtc, timeZoneId);
        return local.ToString("dddd, d MMMM yyyy", CultureInfo.InvariantCulture);
    }

    public static string FormatTimeForEmail(DateTime scheduledAtUtc, string? timeZoneId = null)
    {
        DateTime local = ToLocalScheduledTime(scheduledAtUtc, timeZoneId);
        return local.ToString("HH:mm", CultureInfo.InvariantCulture);
    }

    public static string FormatForEmail(DateTime scheduledAtUtc, string? timeZoneId = null)
    {
        return $"{FormatDateForEmail(scheduledAtUtc, timeZoneId)} {FormatTimeForEmail(scheduledAtUtc, timeZoneId)}";
    }

    private static DateTime ToLocalScheduledTime(DateTime scheduledAtUtc, string? timeZoneId)
    {
        DateTime utc = scheduledAtUtc.Kind == DateTimeKind.Utc
            ? scheduledAtUtc
            : scheduledAtUtc.ToUniversalTime();

        TimeZoneInfo timeZone = ResolveTimeZone(timeZoneId);
        return TimeZoneInfo.ConvertTimeFromUtc(utc, timeZone);
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
