using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class NpgsqlClientWorkspaceReader : IClientWorkspaceReader
{
    private const int LandingClientLimit = 8;
    private const int ActivityLimit = 12;
    private const int ExpiringContractDays = 30;

    private readonly TenantDbContext _tenantDbContext;
    private readonly IClientRepository _clientRepository;

    public NpgsqlClientWorkspaceReader(
        TenantDbContext tenantDbContext,
        IClientRepository clientRepository)
    {
        _tenantDbContext = tenantDbContext;
        _clientRepository = clientRepository;
    }

    public async Task<ClientWorkspaceLandingDto> GetLandingAsync(CancellationToken cancellationToken = default)
    {
        List<Client> clients = await _tenantDbContext.Set<Client>()
            .AsNoTracking()
            .OrderByDescending(client => client.UpdatedAt)
            .ToListAsync(cancellationToken);

        int totalClients = clients.Count;
        IReadOnlyList<ClientListItemDto> recentClients = clients
            .Take(LandingClientLimit)
            .Select(MapListItem)
            .ToList();

        IReadOnlyList<ClientListItemDto> pendingInvites = clients
            .Where(client => client.Status == ClientStatus.Invited)
            .OrderByDescending(client => client.InvitedAt)
            .Take(LandingClientLimit)
            .Select(MapListItem)
            .ToList();

        return new ClientWorkspaceLandingDto(totalClients, recentClients, pendingInvites);
    }

    public async Task<ClientWorkspaceDto?> GetWorkspaceAsync(
        Guid clientId,
        CancellationToken cancellationToken = default)
    {
        ClientDetailDto? client = await _clientRepository.GetDetailByIdAsync(clientId, cancellationToken);
        if (client is null)
        {
            return null;
        }

        OnboardingStatusDto? onboarding = await BuildOnboardingStatusAsync(clientId, cancellationToken);
        ClientWorkspaceMetricsDto metrics = await BuildMetricsAsync(clientId, cancellationToken);
        List<ClientAttentionItemDto> attentionItems = await BuildAttentionItemsAsync(
            client,
            onboarding,
            metrics,
            cancellationToken);
        IReadOnlyList<ClientActivityItemDto> recentActivity = await BuildRecentActivityAsync(
            clientId,
            client,
            cancellationToken);

        ClientDetailDto enrichedClient = client with
        {
            ProjectsSummary = new ClientProjectsSummaryDto(
                metrics.TotalProjects,
                metrics.ActiveProjects,
                Math.Max(0, metrics.TotalProjects - metrics.ActiveProjects)),
            OutstandingInvoices = new ClientOutstandingInvoicesDto(
                metrics.OverdueInvoices,
                metrics.OutstandingInvoiceAmount),
        };

        return new ClientWorkspaceDto(
            enrichedClient,
            onboarding,
            metrics,
            attentionItems,
            recentActivity);
    }

    private async Task<OnboardingStatusDto?> BuildOnboardingStatusAsync(
        Guid clientId,
        CancellationToken cancellationToken)
    {
        OnboardingChecklist? checklist = await _tenantDbContext.Set<OnboardingChecklist>()
            .AsNoTracking()
            .SingleOrDefaultAsync(entry => entry.ClientId == clientId, cancellationToken);

        if (checklist is null)
        {
            return null;
        }

        HashSet<string> completed = checklist.CompletedStepKeys.ToHashSet(StringComparer.Ordinal);
        IReadOnlyList<OnboardingStepStatusDto> steps = checklist.ConfiguredStepKeys
            .Select(step => new OnboardingStepStatusDto(step, completed.Contains(step)))
            .ToList();

        int totalSteps = steps.Count;
        int completedSteps = steps.Count(step => step.IsCompleted);

        return new OnboardingStatusDto(
            checklist.ClientId,
            totalSteps,
            completedSteps,
            totalSteps > 0 && completedSteps == totalSteps,
            steps);
    }

    private async Task<ClientWorkspaceMetricsDto> BuildMetricsAsync(
        Guid clientId,
        CancellationToken cancellationToken)
    {
        DateOnly today = DateOnly.FromDateTime(DateTime.UtcNow);
        DateTime nowUtc = DateTime.UtcNow;
        DateTime expiringBeforeUtc = nowUtc.AddDays(ExpiringContractDays);

        List<Project> projects = await _tenantDbContext.Set<Project>()
            .AsNoTracking()
            .Where(project => project.ClientId == clientId)
            .ToListAsync(cancellationToken);

        List<Invoice> invoices = await _tenantDbContext.Set<Invoice>()
            .AsNoTracking()
            .Where(invoice => invoice.ClientId == clientId)
            .ToListAsync(cancellationToken);

        List<Contract> contracts = await _tenantDbContext.Set<Contract>()
            .AsNoTracking()
            .Where(contract => contract.ClientId == clientId)
            .ToListAsync(cancellationToken);

        List<ClientRequest> requests = await _tenantDbContext.Set<ClientRequest>()
            .AsNoTracking()
            .Where(request => request.ClientId == clientId)
            .ToListAsync(cancellationToken);

        int messageThreads = await _tenantDbContext.Set<MessageThread>()
            .AsNoTracking()
            .CountAsync(thread => thread.ClientId == clientId, cancellationToken);

        int upcomingMeetings = await _tenantDbContext.Set<Meeting>()
            .AsNoTracking()
            .CountAsync(
                meeting => meeting.ClientId == clientId
                    && meeting.ScheduledAt >= nowUtc
                    && meeting.Status == MeetingStatus.Scheduled,
                cancellationToken);

        int activeProjects = projects.Count(project =>
            project.Status is ProjectStatus.Planned or ProjectStatus.InProgress);

        List<Invoice> openInvoices = invoices
            .Where(invoice => invoice.Status is not InvoiceStatus.Paid and not InvoiceStatus.Cancelled)
            .ToList();

        List<Invoice> overdueInvoices = openInvoices
            .Where(invoice => IsOverdue(invoice, today))
            .ToList();

        decimal outstandingAmount = openInvoices.Sum(invoice =>
            Math.Max(0m, invoice.Total - invoice.AmountPaid));

        int unsignedContracts = contracts.Count(contract =>
            contract.Status == ContractStatus.SentForSigning);

        int expiringContracts = contracts.Count(contract =>
            contract.Status != ContractStatus.Signed
            && contract.Status != ContractStatus.Cancelled
            && contract.ExpiresAt.HasValue
            && contract.ExpiresAt.Value <= expiringBeforeUtc
            && contract.ExpiresAt.Value >= nowUtc);

        int openRequests = requests.Count(request =>
            request.Status is ClientRequestStatus.Submitted or ClientRequestStatus.InReview);

        return new ClientWorkspaceMetricsDto(
            TotalProjects: projects.Count,
            ActiveProjects: activeProjects,
            OverdueInvoices: overdueInvoices.Count,
            OutstandingInvoiceAmount: decimal.Round(outstandingAmount, 2, MidpointRounding.ToEven),
            UnsignedContracts: unsignedContracts,
            ExpiringContracts: expiringContracts,
            OpenRequests: openRequests,
            MessageThreads: messageThreads,
            UpcomingMeetings: upcomingMeetings);
    }

    private async Task<List<ClientAttentionItemDto>> BuildAttentionItemsAsync(
        ClientDetailDto client,
        OnboardingStatusDto? onboarding,
        ClientWorkspaceMetricsDto metrics,
        CancellationToken cancellationToken)
    {
        List<ClientAttentionItemDto> items = [];

        if (client.Status == ClientStatus.Invited)
        {
            items.Add(new ClientAttentionItemDto(
                Code: "Clients.PendingInvite",
                Title: "Invitation pending",
                Description: $"{client.ContactName} has not accepted the portal invitation yet.",
                Severity: "warning"));
        }

        if (metrics.OverdueInvoices > 0)
        {
            items.Add(new ClientAttentionItemDto(
                Code: "Invoices.Overdue",
                Title: "Overdue invoices",
                Description: $"{metrics.OverdueInvoices} invoice(s) are overdue for this client.",
                Severity: "critical"));
        }

        if (metrics.UnsignedContracts > 0)
        {
            items.Add(new ClientAttentionItemDto(
                Code: "Contracts.Unsigned",
                Title: "Contracts awaiting signature",
                Description: $"{metrics.UnsignedContracts} contract(s) are waiting to be signed.",
                Severity: "warning"));
        }

        if (metrics.ExpiringContracts > 0)
        {
            items.Add(new ClientAttentionItemDto(
                Code: "Contracts.Expiring",
                Title: "Contracts expiring soon",
                Description: $"{metrics.ExpiringContracts} contract(s) expire within {ExpiringContractDays} days.",
                Severity: "warning"));
        }

        if (metrics.OpenRequests > 0)
        {
            items.Add(new ClientAttentionItemDto(
                Code: "Requests.Open",
                Title: "Open client requests",
                Description: $"{metrics.OpenRequests} request(s) need review or follow-up.",
                Severity: "info"));
        }

        if (onboarding is { IsCompleted: false } && client.Status == ClientStatus.Active)
        {
            items.Add(new ClientAttentionItemDto(
                Code: "Onboarding.Incomplete",
                Title: "Onboarding incomplete",
                Description: $"{onboarding.CompletedSteps} of {onboarding.TotalSteps} onboarding steps completed.",
                Severity: "info"));
        }

        if (items.Count == 0 && client.Status == ClientStatus.Active)
        {
            items.Add(new ClientAttentionItemDto(
                Code: "Clients.Healthy",
                Title: "All clear",
                Description: "No urgent follow-ups for this client right now.",
                Severity: "success"));
        }

        return items;
    }

    private async Task<IReadOnlyList<ClientActivityItemDto>> BuildRecentActivityAsync(
        Guid clientId,
        ClientDetailDto client,
        CancellationToken cancellationToken)
    {
        List<ClientActivityItemDto> activities = [];

        activities.Add(new ClientActivityItemDto(
            Type: "client.invited",
            Title: "Client invited",
            Description: $"Invitation sent to {client.Email}.",
            OccurredAt: client.InvitedAt));

        if (client.OnboardedAt.HasValue)
        {
            activities.Add(new ClientActivityItemDto(
                Type: "client.onboarded",
                Title: "Client activated",
                Description: $"{client.ContactName} accepted the invitation and joined the portal.",
                OccurredAt: client.OnboardedAt.Value));
        }

        List<Invoice> invoices = await _tenantDbContext.Set<Invoice>()
            .AsNoTracking()
            .Where(invoice => invoice.ClientId == clientId)
            .OrderByDescending(invoice => invoice.UpdatedAt)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (Invoice invoice in invoices)
        {
            activities.Add(new ClientActivityItemDto(
                Type: "invoice.updated",
                Title: $"Invoice {invoice.InvoiceNumber}",
                Description: $"Status: {invoice.Status}, total {invoice.Total:0.00} {invoice.Currency}.",
                OccurredAt: invoice.UpdatedAt));
        }

        List<MessageThread> threads = await _tenantDbContext.Set<MessageThread>()
            .AsNoTracking()
            .Where(thread => thread.ClientId == clientId)
            .OrderByDescending(thread => thread.LastMessageAt)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (MessageThread thread in threads)
        {
            activities.Add(new ClientActivityItemDto(
                Type: "message.thread",
                Title: thread.Subject,
                Description: "Message thread activity updated.",
                OccurredAt: thread.LastMessageAt));
        }

        List<ClientRequest> requests = await _tenantDbContext.Set<ClientRequest>()
            .AsNoTracking()
            .Where(request => request.ClientId == clientId)
            .OrderByDescending(request => request.CreatedAt)
            .Take(5)
            .ToListAsync(cancellationToken);

        foreach (ClientRequest request in requests)
        {
            activities.Add(new ClientActivityItemDto(
                Type: "request.submitted",
                Title: request.Title,
                Description: $"Request status: {request.Status}.",
                OccurredAt: request.CreatedAt));
        }

        return activities
            .OrderByDescending(activity => activity.OccurredAt)
            .Take(ActivityLimit)
            .ToList();
    }

    private static bool IsOverdue(Invoice invoice, DateOnly today)
    {
        if (invoice.Status == InvoiceStatus.Overdue)
        {
            return true;
        }

        if (invoice.Status is InvoiceStatus.Paid or InvoiceStatus.Cancelled or InvoiceStatus.Draft)
        {
            return false;
        }

        return invoice.DueDate < today;
    }

    private static ClientListItemDto MapListItem(Client client)
    {
        return new ClientListItemDto(
            client.Id,
            client.CompanyName,
            client.ContactName,
            client.Email.Value,
            client.Phone.Value,
            client.Status,
            client.InvitedAt,
            client.OnboardedAt);
    }
}
