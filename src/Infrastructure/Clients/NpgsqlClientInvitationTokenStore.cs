using Application.Clients.Abstractions;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Clients;

public sealed class NpgsqlClientInvitationTokenStore : IClientInvitationTokenStore
{
    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlClientInvitationTokenStore(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task StoreAsync(
        Guid clientId,
        Guid userId,
        string tokenHash,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default)
    {
        StoredClientInvitationToken entry = new()
        {
            Id = Guid.CreateVersion7(),
            ClientId = clientId,
            UserId = userId,
            TokenHash = tokenHash.Trim(),
            ExpiresAtUtc = expiresAtUtc.ToUniversalTime(),
            CreatedAtUtc = DateTime.UtcNow,
        };

        _tenantDbContext.Set<StoredClientInvitationToken>().Add(entry);
        return Task.CompletedTask;
    }

    public async Task<ClientInvitationTokenRecord?> FindValidByHashAsync(
        string tokenHash,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return null;
        }

        StoredClientInvitationToken? entry = await _tenantDbContext.Set<StoredClientInvitationToken>()
            .AsNoTracking()
            .SingleOrDefaultAsync(token => token.TokenHash == tokenHash.Trim(), cancellationToken);

        if (entry is null || entry.UsedAtUtc.HasValue || entry.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return null;
        }

        return new ClientInvitationTokenRecord(
            entry.ClientId,
            entry.UserId,
            entry.TokenHash,
            entry.ExpiresAtUtc);
    }

    public async Task MarkUsedAsync(
        Guid clientId,
        Guid userId,
        string tokenHash,
        DateTime usedAtUtc,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return;
        }

        StoredClientInvitationToken? entry = await _tenantDbContext.Set<StoredClientInvitationToken>()
            .SingleOrDefaultAsync(token => token.TokenHash == tokenHash.Trim(), cancellationToken);

        if (entry is null)
        {
            return;
        }

        entry.UsedAtUtc = usedAtUtc.ToUniversalTime();
    }

    public async Task InvalidateActiveForUserAsync(
        Guid clientId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        List<StoredClientInvitationToken> activeTokens = await _tenantDbContext.Set<StoredClientInvitationToken>()
            .Where(token =>
                token.ClientId == clientId
                && token.UserId == userId
                && token.UsedAtUtc == null
                && token.ExpiresAtUtc > DateTime.UtcNow)
            .ToListAsync(cancellationToken);

        if (activeTokens.Count == 0)
        {
            return;
        }

        DateTime nowUtc = DateTime.UtcNow;
        foreach (StoredClientInvitationToken token in activeTokens)
        {
            token.UsedAtUtc = nowUtc;
        }
    }
}
