using Application.Finance.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetPurchaseOrdersQuery(
    int Page,
    int PageSize,
    PurchaseOrderStatus? Status,
    Guid? ClientId) : IRequest<Result<GetPurchaseOrdersResultDto>>;
