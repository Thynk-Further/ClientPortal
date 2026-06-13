using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetPurchaseOrderByIdQuery(Guid PurchaseOrderId, Guid ClientId) : IRequest<Result<PurchaseOrderDto>>;
