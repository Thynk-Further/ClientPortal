using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Domain;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientPortalInvoicesReader : IClientPortalInvoicesReader
{
    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientPortalInvoicesReader(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<ClientPortalInvoicesResultDto> GetInvoicesAsync(
        Guid clientId,
        CancellationToken cancellationToken)
    {
        List<ClientPortalInvoiceListItemDto> invoices = await _tenantDbContext.Set<Invoice>()
            .AsNoTracking()
            .Where(invoice =>
                invoice.ClientId == clientId
                && invoice.Status != InvoiceStatus.Draft)
            .OrderByDescending(invoice => invoice.CreatedAt)
            .Select(invoice => new ClientPortalInvoiceListItemDto(
                invoice.Id,
                invoice.ProjectId,
                invoice.InvoiceNumber,
                invoice.Status,
                invoice.Total,
                invoice.AmountPaid,
                decimal.Round(Math.Max(0m, invoice.Total - invoice.AmountPaid), 2, MidpointRounding.ToEven),
                invoice.Currency,
                invoice.DueDate,
                invoice.CreatedAt))
            .ToListAsync(cancellationToken);

        return new ClientPortalInvoicesResultDto(invoices);
    }
}
