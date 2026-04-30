using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class GetQuotesQueryHandler : IRequestHandler<GetQuotesQuery, Result<GetQuotesResultDto>>
{
    private readonly IQuoteRepository _quoteRepository;

    public GetQuotesQueryHandler(IQuoteRepository quoteRepository)
    {
        _quoteRepository = quoteRepository;
    }

    public async Task<Result<GetQuotesResultDto>> Handle(GetQuotesQuery request, CancellationToken cancellationToken)
    {
        PagedResult<QuoteListItemDto> quotes = await _quoteRepository.GetPagedAsync(
            request.Page,
            request.PageSize,
            request.Status,
            request.ClientId,
            request.DueDateFrom,
            request.DueDateTo,
            cancellationToken);

        return Result<GetQuotesResultDto>.Success(new GetQuotesResultDto(quotes));
    }
}
