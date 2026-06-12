using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class QuoteRepository : IQuoteRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public QuoteRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public async Task<PagedResult<QuoteListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        QuoteStatus? status,
        Guid? clientId,
        DateOnly? dueDateFrom,
        DateOnly? dueDateTo,
        CancellationToken cancellationToken)
    {
        IQueryable<Quote> query = _tenantDbContext.Set<Quote>().AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(quote => quote.Status == status.Value);
        }

        if (clientId.HasValue)
        {
            query = query.Where(quote => quote.ClientId == clientId.Value);
        }

        if (dueDateFrom.HasValue)
        {
            query = query.Where(quote => quote.DueDate >= dueDateFrom.Value);
        }

        if (dueDateTo.HasValue)
        {
            query = query.Where(quote => quote.DueDate <= dueDateTo.Value);
        }

        int totalCount = await query.CountAsync(cancellationToken);

        IReadOnlyList<QuoteListItemDto> items = await query
            .OrderByDescending(quote => quote.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(quote => new QuoteListItemDto(
                quote.Id,
                quote.ClientId,
                quote.ProjectId,
                quote.QuoteNumber,
                quote.Status,
                quote.Total,
                quote.Currency,
                quote.DueDate,
                quote.ConvertedInvoiceId,
                quote.RfqId,
                quote.Origin,
                quote.CreatedAt,
                quote.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<QuoteListItemDto>(items, totalCount, page, pageSize);
    }

    public Task<Quote?> FindByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return _tenantDbContext.Set<Quote>().SingleOrDefaultAsync(quote => quote.Id == id, cancellationToken);
    }

    public void Add(Quote quote)
    {
        _tenantDbContext.Set<Quote>().Add(quote);
    }

    public void Update(Quote quote)
    {
        _tenantDbContext.Set<Quote>().Update(quote);
    }

    public void Delete(Quote quote)
    {
        _tenantDbContext.Set<Quote>().Remove(quote);
    }
}
