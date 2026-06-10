using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Meetings.Dtos;
using Domain;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientPortalDashboardReader : IClientPortalDashboardReader
{
    private const int ActiveProjectsLimit = 5;
    private const int RecentDocumentsLimit = 5;
    private const int UpcomingMeetingsLimit = 5;
    private const int RecentInvoicesLimit = 5;

    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientPortalDashboardReader(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<ClientPortalDashboardDto> GetDashboardAsync(
        Guid clientId,
        Guid userId,
        string greetingName,
        CancellationToken cancellationToken = default)
    {
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateTime nowUtc = DateTime.UtcNow;

        List<ClientPortalProjectCardDto> activeProjects = await _tenantDbContext.Set<Project>()
            .AsNoTracking()
            .Where(project =>
                project.ClientId == clientId
                && (project.Status == ProjectStatus.Planned || project.Status == ProjectStatus.InProgress))
            .OrderBy(project => project.EndDate)
            .Take(ActiveProjectsLimit)
            .Select(project => new ClientPortalProjectCardDto(
                project.Id,
                project.Name,
                project.Status,
                project.EndDate))
            .ToListAsync(cancellationToken);

        List<Invoice> openInvoices = await _tenantDbContext.Set<Invoice>()
            .AsNoTracking()
            .Where(invoice =>
                invoice.ClientId == clientId
                && invoice.Status != InvoiceStatus.Paid
                && invoice.Status != InvoiceStatus.Cancelled)
            .OrderBy(invoice => invoice.DueDate)
            .ToListAsync(cancellationToken);

        int overdueCount = openInvoices.Count(invoice => IsOverdue(invoice, today));
        decimal totalOutstanding = openInvoices.Sum(invoice =>
            Math.Max(0m, invoice.Total - invoice.AmountPaid));
        string currency = openInvoices.FirstOrDefault()?.Currency ?? "ZAR";

        IReadOnlyList<ClientPortalInvoiceCardDto> recentOpenInvoices = openInvoices
            .Take(RecentInvoicesLimit)
            .Select(invoice => new ClientPortalInvoiceCardDto(
                invoice.Id,
                invoice.InvoiceNumber,
                invoice.Status,
                Math.Max(0m, invoice.Total - invoice.AmountPaid),
                invoice.Currency,
                invoice.DueDate))
            .ToList();

        ClientPortalOutstandingInvoicesDto outstandingInvoices = new(
            OpenCount: openInvoices.Count,
            OverdueCount: overdueCount,
            TotalOutstanding: decimal.Round(totalOutstanding, 2, MidpointRounding.ToEven),
            Currency: currency,
            RecentOpenInvoices: recentOpenInvoices);

        List<ClientPortalDocumentCardDto> recentDocuments = await _tenantDbContext.Set<Contract>()
            .AsNoTracking()
            .Where(contract => contract.ClientId == clientId)
            .OrderByDescending(contract => contract.UpdatedAt)
            .Take(RecentDocumentsLimit)
            .Select(contract => new ClientPortalDocumentCardDto(
                contract.Id,
                contract.Title,
                "contract",
                contract.Status.ToString(),
                contract.UpdatedAt))
            .ToListAsync(cancellationToken);

        List<MeetingListItemDto> upcomingMeetings = await _tenantDbContext.Set<Meeting>()
            .AsNoTracking()
            .Where(meeting =>
                meeting.ClientId == clientId
                && meeting.ScheduledAt >= nowUtc
                && meeting.Status == MeetingStatus.Scheduled)
            .OrderBy(meeting => meeting.ScheduledAt)
            .Take(UpcomingMeetingsLimit)
            .Select(meeting => new MeetingListItemDto(
                meeting.Id,
                meeting.ClientId,
                meeting.Title,
                meeting.Description,
                meeting.ScheduledAt,
                meeting.DurationMinutes,
                meeting.MeetingUrl,
                meeting.Status,
                meeting.Attendees))
            .ToListAsync(cancellationToken);

        List<MessageThread> clientThreads = await _tenantDbContext.Set<MessageThread>()
            .AsNoTracking()
            .Where(thread => thread.ClientId == clientId)
            .ToListAsync(cancellationToken);

        List<Guid> threadIds = clientThreads
            .Where(thread => thread.Participants.Contains(userId))
            .Select(thread => thread.Id)
            .ToList();

        int unreadCount = threadIds.Count == 0
            ? 0
            : await _tenantDbContext.Set<Message>()
                .AsNoTracking()
                .CountAsync(
                    message =>
                        threadIds.Contains(message.ThreadId)
                        && message.SenderId != userId
                        && message.Status != MessageStatus.Read,
                    cancellationToken);

        ClientPortalMessagesSummaryDto messages = new(
            UnreadCount: unreadCount,
            TotalThreads: threadIds.Count);

        return new ClientPortalDashboardDto(
            greetingName,
            activeProjects,
            outstandingInvoices,
            recentDocuments,
            upcomingMeetings,
            messages);
    }

    private static bool IsOverdue(Invoice invoice, DateOnly today)
    {
        return invoice.DueDate < today
            && invoice.Status is not InvoiceStatus.Paid
            and not InvoiceStatus.Cancelled;
    }
}
