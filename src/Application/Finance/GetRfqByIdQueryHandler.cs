using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetRfqByIdQueryHandler : IRequestHandler<GetRfqByIdQuery, Result<RfqDto>>
{
    private static readonly Error RfqNotFoundError = new("Rfqs.NotFound", "RFQ was not found.", ErrorType.NotFound);

    private readonly IRfqRepository _rfqRepository;

    public GetRfqByIdQueryHandler(IRfqRepository rfqRepository)
    {
        _rfqRepository = rfqRepository;
    }

    public async Task<Result<RfqDto>> Handle(GetRfqByIdQuery request, CancellationToken cancellationToken)
    {
        Rfq? rfq = await _rfqRepository.FindByIdAsync(request.RfqId, cancellationToken);
        if (rfq is null || rfq.ClientId != request.ClientId)
        {
            return Result<RfqDto>.Failure(RfqNotFoundError);
        }

        return Result<RfqDto>.Success(FinanceMapping.Map(rfq));
    }
}
