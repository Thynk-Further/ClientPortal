using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetFinanceAnalyticsQuery(
    Guid? ClientId = null,
    DateOnly? AsOfDate = null) : IRequest<Result<FinanceAnalyticsDto>>;
