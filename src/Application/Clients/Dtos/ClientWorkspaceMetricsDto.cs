namespace Application.Clients.Dtos;

public sealed record ClientWorkspaceMetricsDto(
    int TotalProjects,
    int ActiveProjects,
    int OverdueInvoices,
    decimal OutstandingInvoiceAmount,
    int UnsignedContracts,
    int ExpiringContracts,
    int OpenRequests,
    int MessageThreads,
    int UpcomingMeetings);
