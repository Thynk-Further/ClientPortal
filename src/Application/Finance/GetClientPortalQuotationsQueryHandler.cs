using Application.Clients.Abstractions;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetClientPortalQuotationsQueryHandler
    : IRequestHandler<GetClientPortalQuotationsQuery, Result<GetQuotesResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IQuoteRepository _quoteRepository;

    public GetClientPortalQuotationsQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IQuoteRepository quoteRepository)
    {
        _currentClientResolver = currentClientResolver;
        _quoteRepository = quoteRepository;
    }

    public async Task<Result<GetQuotesResultDto>> Handle(
        GetClientPortalQuotationsQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<GetQuotesResultDto>.Failure(clientIdResult.Errors);
        }

        PagedResult<QuoteListItemDto> quotes = await _quoteRepository.GetPagedAsync(
            request.Page,
            request.PageSize,
            request.Status,
            clientIdResult.Value,
            dueDateFrom: null,
            dueDateTo: null,
            cancellationToken);

        IReadOnlyList<QuoteListItemDto> rfqQuotes = quotes.Items
            .Where(quote => quote.Origin == QuoteOrigin.RfqResponse)
            .ToList()
            .AsReadOnly();

        PagedResult<QuoteListItemDto> filtered = new(
            rfqQuotes,
            rfqQuotes.Count,
            request.Page,
            request.PageSize);

        return Result<GetQuotesResultDto>.Success(new GetQuotesResultDto(filtered));
    }
}
