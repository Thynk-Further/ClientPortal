using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetClientPortalRfqByIdQueryHandler
    : IRequestHandler<GetClientPortalRfqByIdQuery, Result<RfqDto>>
{
    private static readonly Error RfqNotFoundError = new("Rfqs.NotFound", "RFQ was not found.", ErrorType.NotFound);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IRfqRepository _rfqRepository;
    private readonly IClientRepository _clientRepository;
    private readonly IQuoteRepository _quoteRepository;

    public GetClientPortalRfqByIdQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IRfqRepository rfqRepository,
        IClientRepository clientRepository,
        IQuoteRepository quoteRepository)
    {
        _currentClientResolver = currentClientResolver;
        _rfqRepository = rfqRepository;
        _clientRepository = clientRepository;
        _quoteRepository = quoteRepository;
    }

    public async Task<Result<RfqDto>> Handle(GetClientPortalRfqByIdQuery request, CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<RfqDto>.Failure(clientIdResult.Errors);
        }

        Rfq? rfq = await _rfqRepository.FindByIdAsync(request.RfqId, cancellationToken);
        if (rfq is null || rfq.ClientId != clientIdResult.Value)
        {
            return Result<RfqDto>.Failure(RfqNotFoundError);
        }

        Client? client = await _clientRepository.FindByIdAsync(clientIdResult.Value, cancellationToken);
        string clientCompanyName = client?.CompanyName ?? string.Empty;
        decimal? quotationTotal = await ResolveQuotationTotalAsync(rfq, cancellationToken);

        return Result<RfqDto>.Success(FinanceMapping.Map(rfq, clientCompanyName, quotationTotal));
    }

    private async Task<decimal?> ResolveQuotationTotalAsync(Rfq rfq, CancellationToken cancellationToken)
    {
        if (!rfq.QuotationId.HasValue)
        {
            return null;
        }

        Quote? quote = await _quoteRepository.FindByIdAsync(rfq.QuotationId.Value, cancellationToken);
        return quote?.Total;
    }
}
