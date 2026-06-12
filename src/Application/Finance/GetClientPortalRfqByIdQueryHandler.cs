using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Application.Finance.Dtos;
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

    public GetClientPortalRfqByIdQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IRfqRepository rfqRepository)
    {
        _currentClientResolver = currentClientResolver;
        _rfqRepository = rfqRepository;
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

        return Result<RfqDto>.Success(FinanceMapping.Map(rfq));
    }
}
