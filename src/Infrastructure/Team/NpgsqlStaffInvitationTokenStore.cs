using Application.Team.Abstractions;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Team;

public sealed class NpgsqlStaffInvitationTokenStore : IStaffInvitationTokenStore
{
    private readonly TenantDbContext _tenantDbContext;

    public NpgsqlStaffInvitationTokenStore(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task StoreAsync(
        Guid userId,
        string tokenHash,
        DateTime expiresAtUtc,
        CancellationToken cancellationToken = default)
    {
        StoredStaffInvitationToken entry = new()
        {
            Id = Guid.CreateVersion7(),
            UserId = userId,
            TokenHash = tokenHash.Trim(),
            ExpiresAtUtc = expiresAtUtc.ToUniversalTime(),
            CreatedAtUtc = DateTime.UtcNow,
        };

        _tenantDbContext.Set<StoredStaffInvitationToken>().Add(entry);
        return Task.CompletedTask;
    }

    public async Task<StaffInvitationTokenRecord?> FindValidByHashAsync(
        string tokenHash,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return null;
        }

        StoredStaffInvitationToken? entry = await _tenantDbContext.Set<StoredStaffInvitationToken>()
            .AsNoTracking()
            .SingleOrDefaultAsync(token => token.TokenHash == tokenHash.Trim(), cancellationToken);

        if (entry is null || entry.UsedAtUtc.HasValue || entry.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return null;
        }

        return new StaffInvitationTokenRecord(entry.UserId, entry.TokenHash, entry.ExpiresAtUtc);
    }

    public async Task MarkUsedAsync(
        Guid userId,
        string tokenHash,
        DateTime usedAtUtc,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return;
        }

        StoredStaffInvitationToken? entry = await _tenantDbContext.Set<StoredStaffInvitationToken>()
            .SingleOrDefaultAsync(token => token.TokenHash == tokenHash.Trim(), cancellationToken);

        if (entry is null)
        {
            return;
        }

        entry.UsedAtUtc = usedAtUtc.ToUniversalTime();
    }
}
