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

        IQueryable<Rfq> rfqs = _tenantDbContext.Set<Rfq>().AsNoTracking();

        IReadOnlyList<QuoteListItemDto> items = await (
            from quote in query
            join rfq in rfqs on quote.RfqId equals rfq.Id into rfqJoin
            from rfq in rfqJoin.DefaultIfEmpty()
            orderby quote.CreatedAt descending
            select new QuoteListItemDto(
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
                rfq != null ? rfq.Title : null,
                quote.Origin,
                quote.RecipientCompanyName,
                quote.CreatedAt,
                quote.UpdatedAt))
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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
