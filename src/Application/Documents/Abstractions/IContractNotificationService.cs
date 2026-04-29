using Domain;

namespace Application.Documents.Abstractions;

public interface IContractNotificationService
{
    Task NotifySentForSigningAsync(
        Contract contract,
        string signingUrl,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken);
}
