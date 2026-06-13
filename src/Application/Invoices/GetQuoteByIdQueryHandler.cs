using Application.Finance.Abstractions;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class GetQuoteByIdQueryHandler : IRequestHandler<GetQuoteByIdQuery, Result<QuoteDto>>
{
    private static readonly Error QuoteNotFoundError = new("Quotes.NotFound", "Quote was not found.", ErrorType.NotFound);
    private readonly IQuoteRepository _quoteRepository;
    private readonly IRfqRepository _rfqRepository;

    public GetQuoteByIdQueryHandler(
        IQuoteRepository quoteRepository,
        IRfqRepository rfqRepository)
    {
        _quoteRepository = quoteRepository;
        _rfqRepository = rfqRepository;
    }

    public async Task<Result<QuoteDto>> Handle(GetQuoteByIdQuery request, CancellationToken cancellationToken)
    {
        Quote? quote = await _quoteRepository.FindByIdAsync(request.QuoteId, cancellationToken);
        if (quote is null || !QuoteStaffAccess.MatchesClientScope(quote, request.ClientId))
        {
            return Result<QuoteDto>.Failure(QuoteNotFoundError);
        }

        string? rfqTitle = await ResolveRfqTitleAsync(quote, cancellationToken);
        return Result<QuoteDto>.Success(QuoteMapping.Map(quote, rfqTitle));
    }

    private async Task<string?> ResolveRfqTitleAsync(Quote quote, CancellationToken cancellationToken)
    {
        if (!quote.RfqId.HasValue)
        {
            return null;
        }

        Rfq? rfq = await _rfqRepository.FindByIdAsync(quote.RfqId.Value, cancellationToken);
        return rfq?.Title;
    }
}
