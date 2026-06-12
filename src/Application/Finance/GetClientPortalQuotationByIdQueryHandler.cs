using Application.Clients.Abstractions;
using Application.Invoices;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetClientPortalQuotationByIdQueryHandler
    : IRequestHandler<GetClientPortalQuotationByIdQuery, Result<QuoteDto>>
{
    private static readonly Error QuotationNotFoundError = new("Quotes.NotFound", "Quotation was not found.", ErrorType.NotFound);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IQuoteRepository _quoteRepository;

    public GetClientPortalQuotationByIdQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IQuoteRepository quoteRepository)
    {
        _currentClientResolver = currentClientResolver;
        _quoteRepository = quoteRepository;
    }

    public async Task<Result<QuoteDto>> Handle(
        GetClientPortalQuotationByIdQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<QuoteDto>.Failure(clientIdResult.Errors);
        }

        Quote? quote = await _quoteRepository.FindByIdAsync(request.QuotationId, cancellationToken);
        if (quote is null
            || quote.ClientId != clientIdResult.Value
            || quote.Origin != QuoteOrigin.RfqResponse)
        {
            return Result<QuoteDto>.Failure(QuotationNotFoundError);
        }

        return Result<QuoteDto>.Success(QuoteMapping.Map(quote));
    }
}
