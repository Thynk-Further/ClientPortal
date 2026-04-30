using Application.Invoices.Dtos;
using Domain;
using Shared;

namespace Application.Invoices.Abstractions;

public interface IQuoteRepository
{
    Task<PagedResult<QuoteListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        QuoteStatus? status,
        Guid? clientId,
        DateOnly? dueDateFrom,
        DateOnly? dueDateTo,
        CancellationToken cancellationToken);

    Task<Quote?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    void Add(Quote quote);

    void Update(Quote quote);

    void Delete(Quote quote);
}
