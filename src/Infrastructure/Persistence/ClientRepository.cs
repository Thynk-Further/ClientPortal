using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class ClientRepository : IClientRepository
{
    private readonly TenantDbContext _tenantDbContext;
    private readonly IClientInvitationTokenService _clientInvitationTokenService;
    private readonly IClientInvitationTokenStore _clientInvitationTokenStore;

    public ClientRepository(
        TenantDbContext tenantDbContext,
        IClientInvitationTokenService clientInvitationTokenService,
        IClientInvitationTokenStore clientInvitationTokenStore)
    {
        _tenantDbContext = tenantDbContext;
        _clientInvitationTokenService = clientInvitationTokenService;
        _clientInvitationTokenStore = clientInvitationTokenStore;
    }

    public async Task<Client?> GetByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default)
    {
        EmailAddress validatedEmail = Guard.NotNull(email, nameof(email));
        List<Client> clients = await _tenantDbContext.Set<Client>()
            .ToListAsync(cancellationToken);
        return clients.SingleOrDefault(client => client.Email == validatedEmail);
    }

    public async Task<Client?> GetByInviteTokenAsync(string inviteToken, CancellationToken cancellationToken = default)
    {
        string tokenHash = _clientInvitationTokenService.Hash(inviteToken);
        ClientInvitationTokenRecord? record = await _clientInvitationTokenStore.FindValidByHashAsync(tokenHash, cancellationToken);
        if (record is null || record.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return null;
        }

        return await FindByIdAsync(record.ClientId, cancellationToken);
    }

    public Task<Client?> GetWithProjectsAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        // Project aggregate is not introduced yet; return client root for now.
        return FindByIdAsync(clientId, cancellationToken);
    }

    public async Task<bool> ExistsByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default)
    {
        return await GetByEmailAsync(email, cancellationToken) is not null;
    }

    public Task<Client?> FindByIdAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<Client>().SingleOrDefaultAsync(client => client.Id == clientId, cancellationToken);
    }

    public async Task<ClientDetailDto?> GetDetailByIdAsync(Guid clientId, CancellationToken cancellationToken = default)
    {
        Client? client = await FindByIdAsync(clientId, cancellationToken);
        if (client is null)
        {
            return null;
        }

        // Projects summary from tenant data.
        List<Project> projects = await _tenantDbContext.Set<Project>()
            .AsNoTracking()
            .Where(project => project.ClientId == clientId)
            .ToListAsync(cancellationToken);

        int activeProjects = projects.Count(project =>
            project.Status is ProjectStatus.Planned or ProjectStatus.InProgress or ProjectStatus.OnHold);
        int completedProjects = projects.Count(project =>
            project.Status is ProjectStatus.Completed or ProjectStatus.Cancelled);

        return new ClientDetailDto(
            client.Id,
            client.CompanyName,
            client.ContactName,
            client.Email.Value,
            client.Phone.Value,
            client.Status,
            client.InvitedAt,
            client.OnboardedAt,
            client.Notes,
            new ClientProjectsSummaryDto(projects.Count, activeProjects, completedProjects),
            new ClientOutstandingInvoicesDto(0, 0m));
    }

    public async Task<PagedResult<ClientListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? search,
        ClientStatus? status,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Client> query = _tenantDbContext.Set<Client>().AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(client => client.Status == status.Value);
        }

        List<Client> materialized = await query.ToListAsync(cancellationToken);

        string? normalizedSearch = string.IsNullOrWhiteSpace(search) ? null : search.Trim();
        if (normalizedSearch is not null)
        {
            materialized = materialized
                .Where(client =>
                    client.CompanyName.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase)
                    || client.ContactName.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase)
                    || client.Email.Value.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        int totalCount = materialized.Count;
        IReadOnlyList<ClientListItemDto> items = materialized
            .OrderByDescending(client => client.InvitedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(client => new ClientListItemDto(
                client.Id,
                client.CompanyName,
                client.ContactName,
                client.Email.Value,
                client.Phone.Value,
                client.Status,
                client.InvitedAt,
                client.OnboardedAt))
            .ToList();

        return new PagedResult<ClientListItemDto>(items, totalCount, page, pageSize);
    }

    public void Add(Client client)
    {
        _tenantDbContext.Set<Client>().Add(client);
    }

    public void Update(Client client)
    {
        _tenantDbContext.Set<Client>().Update(client);
    }
}
