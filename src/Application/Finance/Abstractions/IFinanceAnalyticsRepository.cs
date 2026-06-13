using Application.Finance.Dtos;

namespace Application.Finance.Abstractions;

public interface IFinanceAnalyticsRepository
{
    Task<FinanceAnalyticsDto> GetAnalyticsAsync(
        Guid? clientId,
        DateOnly asOfDate,
        CancellationToken cancellationToken);
}
