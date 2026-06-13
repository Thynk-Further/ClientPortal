using Application.Finance.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetClientPortalPurchaseOrdersQuery(
    int Page,
    int PageSize,
    PurchaseOrderStatus? Status) : IRequest<Result<GetPurchaseOrdersResultDto>>;
