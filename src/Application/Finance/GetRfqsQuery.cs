using Application.Finance.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetRfqsQuery(
    int Page,
    int PageSize,
    RfqStatus? Status,
    Guid? ClientId) : IRequest<Result<GetRfqsResultDto>>;
