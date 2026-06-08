namespace Application.Clients.Abstractions;

public interface IClientInvitationTokenStore
{
    Task StoreAsync(
        Guid clientId,
        Guid userId,
        string tokenHash,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default);

    Task<ClientInvitationTokenRecord?> FindValidByHashAsync(
        string tokenHash,
        CancellationToken cancellationToken = default);

    Task MarkUsedAsync(
        Guid clientId,
        Guid userId,
        string tokenHash,
        DateTime usedAtUtc,
        CancellationToken cancellationToken = default);

    Task InvalidateActiveForUserAsync(
        Guid clientId,
        Guid userId,
        CancellationToken cancellationToken = default);
}
