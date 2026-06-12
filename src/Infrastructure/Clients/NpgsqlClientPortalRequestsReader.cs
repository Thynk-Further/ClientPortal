using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientPortalRequestsReader : IClientPortalRequestsReader
{
    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientPortalRequestsReader(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<ClientPortalRequestsResultDto> GetRequestsAsync(
        Guid clientId,
        CancellationToken cancellationToken = default)
    {
        List<ClientRequest> requests = await _tenantDbContext.Set<ClientRequest>()
            .AsNoTracking()
            .Where(request => request.ClientId == clientId)
            .OrderByDescending(request => request.CreatedAt)
            .ToListAsync(cancellationToken);

        if (requests.Count == 0)
        {
            return new ClientPortalRequestsResultDto([]);
        }

        Guid[] projectIds = requests
            .Select(request => request.ProjectId)
            .Distinct()
            .ToArray();

        Dictionary<Guid, string> projectNames = await _tenantDbContext.Set<Project>()
            .AsNoTracking()
            .Where(project => projectIds.Contains(project.Id))
            .ToDictionaryAsync(project => project.Id, project => project.Name, cancellationToken);

        IReadOnlyList<ClientPortalRequestListItemDto> items = requests
            .Select(request => new ClientPortalRequestListItemDto(
                request.Id,
                request.ProjectId,
                projectNames.GetValueOrDefault(request.ProjectId, "Unknown project"),
                request.Title,
                request.Description,
                request.Status,
                request.Priority,
                request.CreatedAt,
                request.UpdatedAt))
            .ToList();

        return new ClientPortalRequestsResultDto(items);
    }
}
