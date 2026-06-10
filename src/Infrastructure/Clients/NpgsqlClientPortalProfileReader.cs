using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientPortalProfileReader : IClientPortalProfileReader
{
    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientPortalProfileReader(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<ClientPortalProfileDto> GetProfileAsync(
        Guid clientId,
        CancellationToken cancellationToken)
    {
        ClientPortalProfileDto? profile = await _tenantDbContext.Set<Client>()
            .AsNoTracking()
            .Where(client => client.Id == clientId)
            .Select(client => new ClientPortalProfileDto(
                client.CompanyName,
                client.ContactName,
                client.Email.Value,
                client.Phone.Value))
            .SingleOrDefaultAsync(cancellationToken);

        if (profile is null)
        {
            throw new InvalidOperationException("Client profile was not found.");
        }

        return profile;
    }
}
