using Application.Projects.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class ClientRequestRepository : IClientRequestRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public ClientRequestRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<ClientRequest?> FindByIdAsync(Guid requestId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<ClientRequest>()
            .SingleOrDefaultAsync(request => request.Id == requestId, cancellationToken);
    }

    public void Add(ClientRequest request)
    {
        _tenantDbContext.Set<ClientRequest>().Add(request);
    }

    public void Update(ClientRequest request)
    {
        _tenantDbContext.Set<ClientRequest>().Update(request);
    }
}
