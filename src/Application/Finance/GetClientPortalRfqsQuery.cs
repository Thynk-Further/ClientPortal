using Application.Finance.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetClientPortalRfqsQuery(
    int Page,
    int PageSize,
    RfqStatus? Status) : IRequest<Result<GetRfqsResultDto>>;
