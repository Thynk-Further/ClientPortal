using Domain;

namespace Application.Team.Abstractions;

public sealed record StaffInvitationTokenRecord(
    Guid UserId,
    string TokenHash,
    DateTime ExpiresAtUtc);

public interface IStaffInvitationTokenStore
{
    Task StoreAsync(
        Guid userId,
        string tokenHash,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default);

    Task<StaffInvitationTokenRecord?> FindValidByHashAsync(
        string tokenHash,
        CancellationToken cancellationToken = default);

    Task MarkUsedAsync(
        Guid userId,
        string tokenHash,
        DateTime usedAtUtc,
        CancellationToken cancellationToken = default);
}
