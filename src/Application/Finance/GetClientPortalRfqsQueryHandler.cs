using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetClientPortalRfqsQueryHandler
    : IRequestHandler<GetClientPortalRfqsQuery, Result<GetRfqsResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IRfqRepository _rfqRepository;

    public GetClientPortalRfqsQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IRfqRepository rfqRepository)
    {
        _currentClientResolver = currentClientResolver;
        _rfqRepository = rfqRepository;
    }

    public async Task<Result<GetRfqsResultDto>> Handle(GetClientPortalRfqsQuery request, CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<GetRfqsResultDto>.Failure(clientIdResult.Errors);
        }

        PagedResult<RfqListItemDto> rfqs = await _rfqRepository.GetPagedAsync(
            request.Page,
            request.PageSize,
            request.Status,
            clientIdResult.Value,
            cancellationToken);

        return Result<GetRfqsResultDto>.Success(new GetRfqsResultDto(rfqs));
    }
}
