using Application.Invoices.Dtos;
using Domain;
using Shared;

namespace Application.Invoices.Abstractions;

public interface IInvoiceRepository
{
    Task<PagedResult<InvoiceListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        InvoiceStatus? status,
        Guid? clientId,
        DateOnly? dueDateFrom,
        DateOnly? dueDateTo,
        CancellationToken cancellationToken);

    Task<InvoiceAgingSummaryDto> GetAgingSummaryAsync(
        InvoiceStatus? status,
        Guid? clientId,
        DateOnly? dueDateFrom,
        DateOnly? dueDateTo,
        DateOnly asOfDate,
        CancellationToken cancellationToken);

    Task<GetFinancialSummaryResultDto> GetFinancialSummaryAsync(
        Guid? clientId,
        DateOnly? fromDate,
        DateOnly? toDate,
        DateOnly asOfDate,
        CancellationToken cancellationToken);

    Task<Invoice?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    void Add(Invoice invoice);

    void Update(Invoice invoice);

    void Delete(Invoice invoice);
}
