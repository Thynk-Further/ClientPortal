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

    public GetQuoteByIdQueryHandler(IQuoteRepository quoteRepository)
    {
        _quoteRepository = quoteRepository;
    }

    public async Task<Result<QuoteDto>> Handle(GetQuoteByIdQuery request, CancellationToken cancellationToken)
    {
        Quote? quote = await _quoteRepository.FindByIdAsync(request.QuoteId, cancellationToken);
        if (quote is null || quote.ClientId != request.ClientId)
        {
            return Result<QuoteDto>.Failure(QuoteNotFoundError);
        }

        return Result<QuoteDto>.Success(QuoteMapping.Map(quote));
    }
}
