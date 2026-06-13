using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using ClientEntity = Domain.Client;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetPurchaseOrderByIdQueryHandler
    : IRequestHandler<GetPurchaseOrderByIdQuery, Result<PurchaseOrderDto>>
{
    private static readonly Error PurchaseOrderNotFoundError = new(
        "PurchaseOrders.NotFound",
        "Purchase order was not found.",
        ErrorType.NotFound);

    private readonly IPurchaseOrderRepository _purchaseOrderRepository;
    private readonly IClientRepository _clientRepository;
    private readonly IRfqRepository _rfqRepository;

    public GetPurchaseOrderByIdQueryHandler(
        IPurchaseOrderRepository purchaseOrderRepository,
        IClientRepository clientRepository,
        IRfqRepository rfqRepository)
    {
        _purchaseOrderRepository = purchaseOrderRepository;
        _clientRepository = clientRepository;
        _rfqRepository = rfqRepository;
    }

    public async Task<Result<PurchaseOrderDto>> Handle(
        GetPurchaseOrderByIdQuery request,
        CancellationToken cancellationToken)
    {
        PurchaseOrder? purchaseOrder = await _purchaseOrderRepository.FindByIdAsync(
            request.PurchaseOrderId,
            cancellationToken);

        if (purchaseOrder is null || purchaseOrder.ClientId != request.ClientId)
        {
            return Result<PurchaseOrderDto>.Failure(PurchaseOrderNotFoundError);
        }

        ClientEntity? client = await _clientRepository.FindByIdAsync(purchaseOrder.ClientId, cancellationToken);
        Rfq? rfq = await _rfqRepository.FindByIdAsync(purchaseOrder.RfqId, cancellationToken);

        return Result<PurchaseOrderDto>.Success(
            FinanceMapping.Map(
                purchaseOrder,
                client?.CompanyName ?? string.Empty,
                rfq?.RfqNumber,
                rfq?.Title));
    }
}
