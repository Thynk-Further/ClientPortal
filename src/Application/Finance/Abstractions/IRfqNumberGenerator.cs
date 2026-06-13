using Shared;

namespace Application.Finance.Abstractions;

public interface IRfqNumberGenerator
{
    Task<Result<string>> GenerateAsync(Guid clientId, CancellationToken cancellationToken = default);
}
