using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientPortalDocumentsReader : IClientPortalDocumentsReader
{
    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientPortalDocumentsReader(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<ClientPortalDocumentsResultDto> GetDocumentsAsync(
        Guid clientId,
        CancellationToken cancellationToken)
    {
        List<ClientPortalDocumentListItemDto> documents = await _tenantDbContext.Set<Contract>()
            .AsNoTracking()
            .Where(contract =>
                contract.ClientId == clientId
                && contract.Status != ContractStatus.Draft)
            .OrderByDescending(contract => contract.UpdatedAt)
            .Select(contract => new ClientPortalDocumentListItemDto(
                contract.Id,
                contract.Title,
                "contract",
                contract.Status,
                contract.UpdatedAt,
                contract.Status == ContractStatus.SentForSigning))
            .ToListAsync(cancellationToken);

        return new ClientPortalDocumentsResultDto(documents);
    }
}
