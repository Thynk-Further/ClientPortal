using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetRfqsQueryHandler : IRequestHandler<GetRfqsQuery, Result<GetRfqsResultDto>>
{
    private readonly IRfqRepository _rfqRepository;

    public GetRfqsQueryHandler(IRfqRepository rfqRepository)
    {
        _rfqRepository = rfqRepository;
    }

    public async Task<Result<GetRfqsResultDto>> Handle(GetRfqsQuery request, CancellationToken cancellationToken)
    {
        PagedResult<RfqListItemDto> rfqs = await _rfqRepository.GetPagedAsync(
            request.Page,
            request.PageSize,
            request.Status,
            request.ClientId,
            cancellationToken);

        return Result<GetRfqsResultDto>.Success(new GetRfqsResultDto(rfqs));
    }
}
