using Application.Abstractions;
using Application.Notifications.Abstractions;
using Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Infrastructure.Notifications;

public sealed class NpgsqlWeeklyDigestReader : IWeeklyDigestReader
{
    private readonly string _postgresConnectionString;
    private readonly ITenantPublicRecordLookup _tenantPublicRecordLookup;
    private readonly ILogger<NpgsqlWeeklyDigestReader> _logger;

    public NpgsqlWeeklyDigestReader(
        IConfiguration configuration,
        ITenantPublicRecordLookup tenantPublicRecordLookup,
        ILogger<NpgsqlWeeklyDigestReader> logger)
    {
        _postgresConnectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres must be configured.");
        _tenantPublicRecordLookup = tenantPublicRecordLookup;
        _logger = logger;
    }

    public async Task<IReadOnlyList<WeeklyDigestItem>> GetWeeklyDigestItemsAsync(
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        List<WeeklyDigestItem> digestItems = [];

        await using NpgsqlConnection connection = new(_postgresConnectionString);
        await connection.OpenAsync(cancellationToken);

        IReadOnlyList<string> tenantSlugs = await GetActiveTenantSlugsAsync(connection, cancellationToken);
        foreach (string tenantSlug in tenantSlugs)
        {
            TenantPublicRecord? tenantRecord = await _tenantPublicRecordLookup.FindBySlugAsync(
                tenantSlug,
                cancellationToken);

            if (tenantRecord is null
                || !tenantRecord.Settings.NotificationChannels.Contains("weekly_digest", StringComparer.OrdinalIgnoreCase))
            {
                continue;
            }

            string schema = BuildTenantSchemaName(tenantSlug);
            try
            {
                IReadOnlyList<string> ownerRecipients = await GetOwnerRecipientsAsync(connection, schema, cancellationToken);
                if (ownerRecipients.Count == 0)
                {
                    continue;
                }

                WeeklyDigestMetrics metrics = await GetMetricsAsync(connection, schema, nowUtc, cancellationToken);
                foreach (string ownerRecipient in ownerRecipients)
                {
                    digestItems.Add(new WeeklyDigestItem(
                        tenantSlug,
                        ownerRecipient,
                        metrics.ActiveClients,
                        metrics.OpenInvoices,
                        metrics.OverdueInvoices,
                        metrics.OverdueAmountTotal,
                        metrics.UpcomingMeetingsNext7Days,
                        metrics.ContractsExpiringNext30Days));
                }
            }
            catch (PostgresException ex)
            {
                _logger.LogWarning(
                    ex,
                    "Skipping weekly digest data query for tenant {TenantSlug} because schema query failed.",
                    tenantSlug);
            }
        }

        return digestItems;
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

    private static async Task<IReadOnlyList<string>> GetOwnerRecipientsAsync(
        NpgsqlConnection connection,
        string schema,
        CancellationToken cancellationToken)
    {
        string sql = $"""
            select email
            from {schema}.portal_users
            where role = 1
              and is_active = true;
            """;

        List<string> recipients = [];
        await using NpgsqlCommand command = new(sql, connection);
        await using NpgsqlDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            recipients.Add(reader.GetString(0));
        }

        return recipients
            .Where(static email => !string.IsNullOrWhiteSpace(email))
            .Select(static email => email.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static async Task<WeeklyDigestMetrics> GetMetricsAsync(
        NpgsqlConnection connection,
        string schema,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        string sql = $"""
            select
                (select count(*)
                 from {schema}.clients c
                 where c.status = 2) as active_clients,
                (select count(*)
                 from {schema}.invoices i
                 where i.status in (2, 3, 4, 6)) as open_invoices,
                (select count(*)
                 from {schema}.invoices i
                 where i.status in (2, 3, 4, 6)
                   and i.due_date < @today) as overdue_invoices,
                (select coalesce(sum(greatest(i.total - coalesce(i.amount_paid, 0), 0)), 0)
                 from {schema}.invoices i
                 where i.status in (2, 3, 4, 6)
                   and i.due_date < @today) as overdue_amount_total,
                (select count(*)
                 from {schema}.meetings m
                 where m.status = 1
                   and m.scheduled_at >= @now_utc
                   and m.scheduled_at < @next_7_days_utc) as upcoming_meetings_next_7_days,
                (select count(*)
                 from {schema}.contracts c
                 where c.status in (2, 3)
                   and c.expires_at is not null
                   and c.expires_at >= @now_utc
                   and c.expires_at < @next_30_days_utc) as contracts_expiring_next_30_days;
            """;

        await using NpgsqlCommand command = new(sql, connection);
        command.Parameters.AddWithValue("today", DateOnly.FromDateTime(nowUtc));
        command.Parameters.AddWithValue("now_utc", nowUtc);
        command.Parameters.AddWithValue("next_7_days_utc", nowUtc.AddDays(7));
        command.Parameters.AddWithValue("next_30_days_utc", nowUtc.AddDays(30));

        await using NpgsqlDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return WeeklyDigestMetrics.Empty;
        }

        return new WeeklyDigestMetrics(
            reader.GetInt32(0),
            reader.GetInt32(1),
            reader.GetInt32(2),
            reader.GetDecimal(3),
            reader.GetInt32(4),
            reader.GetInt32(5));
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

    private sealed record WeeklyDigestMetrics(
        int ActiveClients,
        int OpenInvoices,
        int OverdueInvoices,
        decimal OverdueAmountTotal,
        int UpcomingMeetingsNext7Days,
        int ContractsExpiringNext30Days)
    {
        public static WeeklyDigestMetrics Empty => new(0, 0, 0, 0m, 0, 0);
    }
}
