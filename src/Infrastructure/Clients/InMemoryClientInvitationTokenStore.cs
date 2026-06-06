using System.Collections.Concurrent;
using Application.Clients.Abstractions;

namespace Infrastructure.Clients;

public sealed class InMemoryClientInvitationTokenStore : IClientInvitationTokenStore
{
    private readonly ConcurrentDictionary<string, TokenEntry> _entries = new(StringComparer.Ordinal);

    public Task StoreAsync(
        Guid clientId,
        Guid userId,
        string tokenHash,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default)
    {
        TokenEntry entry = new(
            clientId,
            userId,
            tokenHash,
            expiresAtUtc.ToUniversalTime(),
            UsedAtUtc: null);

        _entries[tokenHash] = entry;
        return Task.CompletedTask;
    }

    public Task<ClientInvitationTokenRecord?> FindValidByHashAsync(
        string tokenHash,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return Task.FromResult<ClientInvitationTokenRecord?>(null);
        }

        if (!_entries.TryGetValue(tokenHash, out TokenEntry? entry))
        {
            return Task.FromResult<ClientInvitationTokenRecord?>(null);
        }

        if (entry.UsedAtUtc.HasValue || entry.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return Task.FromResult<ClientInvitationTokenRecord?>(null);
        }

        return Task.FromResult<ClientInvitationTokenRecord?>(
            new ClientInvitationTokenRecord(
                entry.ClientId,
                entry.UserId,
                entry.TokenHash,
                entry.ExpiresAtUtc));
    }

    public Task MarkUsedAsync(
        Guid clientId,
        Guid userId,
        string tokenHash,
        DateTime usedAtUtc,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return Task.CompletedTask;
        }

        if (_entries.TryGetValue(tokenHash, out TokenEntry? entry))
        {
            _entries[tokenHash] = entry with
            {
                UsedAtUtc = usedAtUtc.ToUniversalTime()
            };
        }

        return Task.CompletedTask;
    }

    public Task InvalidateActiveForUserAsync(
        Guid clientId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        DateTime nowUtc = DateTime.UtcNow;
        foreach (KeyValuePair<string, TokenEntry> pair in _entries)
        {
            TokenEntry entry = pair.Value;
            if (entry.ClientId == clientId
                && entry.UserId == userId
                && !entry.UsedAtUtc.HasValue
                && entry.ExpiresAtUtc > nowUtc)
            {
                _entries[pair.Key] = entry with { UsedAtUtc = nowUtc };
            }
        }

        return Task.CompletedTask;
    }

    private sealed record TokenEntry(
        Guid ClientId,
        Guid UserId,
        string TokenHash,
        DateTime ExpiresAtUtc,
        DateTime? UsedAtUtc);
}
