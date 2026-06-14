using Application.Meetings.Abstractions;
using Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Infrastructure.Meetings;

public sealed class NpgsqlMeetingReminderReader : IMeetingReminderReader
{
    private readonly string _postgresConnectionString;
    private readonly ILogger<NpgsqlMeetingReminderReader> _logger;

    public NpgsqlMeetingReminderReader(
        IConfiguration configuration,
        ILogger<NpgsqlMeetingReminderReader> logger)
    {
        _postgresConnectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres must be configured.");
        _logger = logger;
    }

    public async Task<IReadOnlyList<MeetingReminderItem>> GetPendingRemindersAsync(
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        List<MeetingReminderItem> reminders = [];

        await using NpgsqlConnection connection = new(_postgresConnectionString);
        await connection.OpenAsync(cancellationToken);

        IReadOnlyList<string> tenantSlugs = await GetActiveTenantSlugsAsync(connection, cancellationToken);
        foreach (string tenantSlug in tenantSlugs)
        {
            string schema = BuildTenantSchemaName(tenantSlug);
            try
            {
                IReadOnlyList<MeetingReminderItem> tenantReminders = await GetPendingRemindersForTenantAsync(
                    connection,
                    schema,
                    tenantSlug,
                    nowUtc,
                    cancellationToken);
                reminders.AddRange(tenantReminders);
            }
            catch (PostgresException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Skipping meeting reminder scan for tenant {TenantSlug} because schema query failed.",
                    tenantSlug);
            }
        }

        return reminders;
    }

    private static async Task<IReadOnlyList<string>> GetActiveTenantSlugsAsync(
        NpgsqlConnection connection,
        CancellationToken cancellationToken)
    {
        List<string> tenantSlugs = [];
        await using NpgsqlCommand command = new(PublicTenantActiveSlugsSql.SelectActiveTenantSlugs, connection);
        await using NpgsqlDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            tenantSlugs.Add(reader.GetString(0));
        }

        return tenantSlugs;
    }

    private static async Task<IReadOnlyList<MeetingReminderItem>> GetPendingRemindersForTenantAsync(
        NpgsqlConnection connection,
        string schema,
        string tenantSlug,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        List<MeetingReminderItem> reminders = [];

        DateTime dayWindowStart = nowUtc.AddHours(24);
        DateTime dayWindowEnd = nowUtc.AddHours(25);
        reminders.AddRange(await QueryWindowAsync(
            connection,
            schema,
            tenantSlug,
            dayWindowStart,
            dayWindowEnd,
            MeetingReminderLeadTime.OneDay,
            cancellationToken));

        DateTime hourWindowStart = nowUtc.AddHours(1);
        DateTime hourWindowEnd = nowUtc.AddHours(2);
        reminders.AddRange(await QueryWindowAsync(
            connection,
            schema,
            tenantSlug,
            hourWindowStart,
            hourWindowEnd,
            MeetingReminderLeadTime.OneHour,
            cancellationToken));

        DateTime fifteenMinuteWindowStart = nowUtc.AddMinutes(15);
        DateTime fifteenMinuteWindowEnd = nowUtc.AddMinutes(20);
        reminders.AddRange(await QueryWindowAsync(
            connection,
            schema,
            tenantSlug,
            fifteenMinuteWindowStart,
            fifteenMinuteWindowEnd,
            MeetingReminderLeadTime.FifteenMinutes,
            cancellationToken));

        return reminders;
    }

    private static async Task<IReadOnlyList<MeetingReminderItem>> QueryWindowAsync(
        NpgsqlConnection connection,
        string schema,
        string tenantSlug,
        DateTime windowStartUtc,
        DateTime windowEndUtc,
        MeetingReminderLeadTime leadTime,
        CancellationToken cancellationToken)
    {
        string sql = $"""
            select
                m.id,
                m.client_id,
                m.title,
                m.scheduled_at,
                m.meeting_url,
                c.contact_name,
                c.email,
                c.phone
            from {schema}.meetings m
            inner join {schema}.clients c on c.id = m.client_id
            where m.status = 1
              and m.scheduled_at >= @window_start
              and m.scheduled_at < @window_end;
            """;

        List<MeetingReminderItem> reminders = [];
        await using NpgsqlCommand command = new(sql, connection);
        command.Parameters.AddWithValue("window_start", windowStartUtc);
        command.Parameters.AddWithValue("window_end", windowEndUtc);

        await using NpgsqlDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            reminders.Add(new MeetingReminderItem(
                tenantSlug,
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetString(2),
                reader.GetDateTime(3),
                reader.GetString(4),
                reader.GetString(5),
                reader.GetString(6),
                reader.GetString(7),
                leadTime));
        }

        return reminders;
    }

    private static string BuildTenantSchemaName(string tenantSlug)
    {
        string normalizedSlug = tenantSlug.Trim().ToLowerInvariant().Replace("-", "_", StringComparison.Ordinal);
        if (normalizedSlug.Length == 0 || normalizedSlug.Any(ch => !(char.IsAsciiLetterOrDigit(ch) || ch == '_')))
        {
            throw new InvalidOperationException("Tenant slug contains unsupported characters for schema name.");
        }

        return $"tenant_{normalizedSlug}";
    }
}
