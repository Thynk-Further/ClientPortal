using Application.Finance.Abstractions;
using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class GetFinanceAnalyticsQueryHandler : IRequestHandler<GetFinanceAnalyticsQuery, Result<FinanceAnalyticsDto>>
{
    private readonly IFinanceAnalyticsRepository _financeAnalyticsRepository;

    public GetFinanceAnalyticsQueryHandler(IFinanceAnalyticsRepository financeAnalyticsRepository)
    {
        _financeAnalyticsRepository = financeAnalyticsRepository;
    }

    public async Task<Result<FinanceAnalyticsDto>> Handle(
        GetFinanceAnalyticsQuery request,
        CancellationToken cancellationToken)
    {
        DateOnly asOfDate = request.AsOfDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        FinanceAnalyticsDto analytics = await _financeAnalyticsRepository.GetAnalyticsAsync(
            request.ClientId,
            asOfDate,
            cancellationToken);

        return Result<FinanceAnalyticsDto>.Success(analytics);
    }
}
