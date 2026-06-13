using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetClientPortalPurchaseOrdersQueryHandler
    : IRequestHandler<GetClientPortalPurchaseOrdersQuery, Result<GetPurchaseOrdersResultDto>>
{
    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IPurchaseOrderRepository _purchaseOrderRepository;

    public GetClientPortalPurchaseOrdersQueryHandler(
        ICurrentClientResolver currentClientResolver,
        IPurchaseOrderRepository purchaseOrderRepository)
    {
        _currentClientResolver = currentClientResolver;
        _purchaseOrderRepository = purchaseOrderRepository;
    }

    public async Task<Result<GetPurchaseOrdersResultDto>> Handle(
        GetClientPortalPurchaseOrdersQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<GetPurchaseOrdersResultDto>.Failure(clientIdResult.Errors);
        }

        PagedResult<PurchaseOrderListItemDto> purchaseOrders = await _purchaseOrderRepository.GetPagedAsync(
            request.Page,
            request.PageSize,
            request.Status,
            clientIdResult.Value,
            cancellationToken);

        return Result<GetPurchaseOrdersResultDto>.Success(new GetPurchaseOrdersResultDto(purchaseOrders));
    }
}
