using Application.Meetings.Dtos;
using Domain;

namespace Application.Clients.Dtos;

public sealed record ClientPortalDashboardDto(
    string GreetingName,
    IReadOnlyList<ClientPortalProjectCardDto> ActiveProjects,
    ClientPortalOutstandingInvoicesDto OutstandingInvoices,
    IReadOnlyList<ClientPortalDocumentCardDto> RecentDocuments,
    IReadOnlyList<MeetingListItemDto> UpcomingMeetings,
    ClientPortalMessagesSummaryDto Messages);

public sealed record ClientPortalProjectCardDto(
    Guid Id,
    string Name,
    ProjectStatus Status,
    DateOnly EndDate);

public sealed record ClientPortalOutstandingInvoicesDto(
    int OpenCount,
    int OverdueCount,
    decimal TotalOutstanding,
    string Currency,
    IReadOnlyList<ClientPortalInvoiceCardDto> RecentOpenInvoices);

public sealed record ClientPortalInvoiceCardDto(
    Guid Id,
    string InvoiceNumber,
    InvoiceStatus Status,
    decimal OutstandingAmount,
    string Currency,
    DateOnly DueDate);

public sealed record ClientPortalDocumentCardDto(
    Guid Id,
    string Name,
    string Type,
    string Status,
    DateTime UpdatedAtUtc);

public sealed record ClientPortalMessagesSummaryDto(
    int UnreadCount,
    int TotalThreads);
