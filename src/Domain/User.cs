using Shared;

namespace Domain;

public sealed class User : AggregateRoot<Guid>
{
    private readonly List<RefreshToken> _refreshTokens = [];
    private readonly List<Permission> _permissions = [];

    public EmailAddress Email { get; private set; } = null!;

    public string FullName { get; private set; } = string.Empty;

    public string PasswordHash { get; private set; } = string.Empty;

    public Role Role { get; private set; }

    public bool IsActive { get; private set; } = true;

    public DateTime? LastLoginAt { get; private set; }

    public IReadOnlyCollection<RefreshToken> RefreshTokens => _refreshTokens.AsReadOnly();

    public IReadOnlyCollection<Permission> Permissions => _permissions.AsReadOnly();

    private User()
    {
    }

    private User(
        Guid id,
        EmailAddress email,
        string fullName,
        string passwordHash,
        Role role,
        bool isActive,
        DateTime? lastLoginAt,
        IEnumerable<RefreshToken>? refreshTokens,
        IEnumerable<Permission>? permissions)
        : base(id)
    {
        Email = Guard.NotNull(email, nameof(email));
        FullName = NormalizeFullName(fullName);
        PasswordHash = NormalizePasswordHash(passwordHash);
        Role = role;
        IsActive = isActive;
        LastLoginAt = NormalizeLastLoginAt(lastLoginAt);

        if (refreshTokens is not null)
        {
            _refreshTokens.AddRange(refreshTokens);
        }

        if (permissions is not null)
        {
            foreach (Permission permission in permissions)
            {
                AddPermissionWithoutMark(permission);
            }
        }
    }

    public static User Create(
        Guid id,
        EmailAddress email,
        string fullName,
        string passwordHash,
        Role role,
        bool isActive = true,
        DateTime? lastLoginAt = null,
        IEnumerable<RefreshToken>? refreshTokens = null,
        IEnumerable<Permission>? permissions = null)
    {
        return new User(id, email, fullName, passwordHash, role, isActive, lastLoginAt, refreshTokens, permissions);
    }

    public void UpdateProfile(string fullName)
    {
        FullName = NormalizeFullName(fullName);
        MarkUpdated();
    }

    public void UpdatePasswordHash(string passwordHash)
    {
        PasswordHash = NormalizePasswordHash(passwordHash);
        MarkUpdated();
    }

    public void ChangeRole(Role role)
    {
        Role = role;
        MarkUpdated();
    }

    public void Activate()
    {
        IsActive = true;
        MarkUpdated();
    }

    public void RaiseStaffInvitedEvent(
        string inviteToken,
        string tenantSlug,
        DateTime invitedAtUtc)
    {
        string normalizedInviteToken = Guard.NotEmpty(inviteToken, nameof(inviteToken)).Trim();
        string normalizedTenantSlug = Guard.NotEmpty(tenantSlug, nameof(tenantSlug)).Trim().ToLowerInvariant();
        DateTime invitedAt = invitedAtUtc.Kind == DateTimeKind.Utc
            ? invitedAtUtc
            : invitedAtUtc.ToUniversalTime();

        AddDomainEvent(new StaffInvitedEvent(
            Id,
            Email.Value,
            FullName,
            normalizedInviteToken,
            normalizedTenantSlug,
            invitedAt));
    }

    public void Deactivate()
    {
        IsActive = false;
        MarkUpdated();
    }

    public void MarkLogin(DateTime? loggedInAtUtc = null)
    {
        LastLoginAt = NormalizeLastLoginAt(loggedInAtUtc ?? DateTime.UtcNow);
        MarkUpdated();
    }

    public void AddRefreshToken(RefreshToken refreshToken)
    {
        RefreshToken token = Guard.NotNull(refreshToken, nameof(refreshToken));
        _refreshTokens.Add(token);
        MarkUpdated();
    }

    public void GrantPermission(Permission permission)
    {
        if (!AddPermissionWithoutMark(permission))
        {
            return;
        }

        MarkUpdated();
    }

    public void RevokePermission(Permission permission)
    {
        Permission validatedPermission = Guard.NotNull(permission, nameof(permission));
        if (!_permissions.Remove(validatedPermission))
        {
            return;
        }

        MarkUpdated();
    }

    public bool HasPermission(Permission permission)
    {
        Permission validatedPermission = Guard.NotNull(permission, nameof(permission));
        return _permissions.Contains(validatedPermission);
    }

    public void ReplacePermissions(IEnumerable<Permission>? permissions)
    {
        _permissions.Clear();

        if (permissions is not null)
        {
            foreach (Permission permission in permissions)
            {
                AddPermissionWithoutMark(permission, nameof(permissions));
            }
        }

        MarkUpdated();
    }

    private bool AddPermissionWithoutMark(Permission permission, string paramName = "permission")
    {
        Permission validatedPermission = Guard.NotNull(permission, paramName);
        if (_permissions.Contains(validatedPermission))
        {
            return false;
        }

        _permissions.Add(validatedPermission);
        return true;
    }

    public void RevokeRefreshToken(string tokenHash, DateTime? revokedAtUtc = null, string? replacedByToken = null)
    {
        string normalizedTokenHash = Guard.NotEmpty(tokenHash, nameof(tokenHash)).Trim();

        int tokenIndex = _refreshTokens.FindIndex(existing =>
            string.Equals(existing.TokenHash, normalizedTokenHash, StringComparison.Ordinal));

        if (tokenIndex < 0)
        {
            return;
        }

        DateTime revokedAt = revokedAtUtc ?? DateTime.UtcNow;
        _refreshTokens[tokenIndex] = _refreshTokens[tokenIndex].Revoke(revokedAt, replacedByToken);
        MarkUpdated();
    }

    public int RevokeRefreshTokenFamily(DateTime? revokedAtUtc = null)
    {
        DateTime revokedAt = revokedAtUtc ?? DateTime.UtcNow;
        int revokedCount = 0;

        for (int index = 0; index < _refreshTokens.Count; index++)
        {
            RefreshToken token = _refreshTokens[index];
            if (token.IsRevoked)
            {
                continue;
            }

            _refreshTokens[index] = token.Revoke(revokedAt);
            revokedCount++;
        }

        if (revokedCount > 0)
        {
            MarkUpdated();
        }

        return revokedCount;
    }

    private static string NormalizeFullName(string fullName)
    {
        return Guard.NotEmpty(fullName, nameof(fullName)).Trim();
    }

    private static string NormalizePasswordHash(string passwordHash)
    {
        return Guard.NotEmpty(passwordHash, nameof(passwordHash)).Trim();
    }

    private static DateTime? NormalizeLastLoginAt(DateTime? lastLoginAtUtc)
    {
        if (!lastLoginAtUtc.HasValue)
        {
            return null;
        }

        DateTime normalized = lastLoginAtUtc.Value;
        if (normalized.Kind == DateTimeKind.Local)
        {
            normalized = normalized.ToUniversalTime();
        }
        else if (normalized.Kind == DateTimeKind.Unspecified)
        {
            normalized = DateTime.SpecifyKind(normalized, DateTimeKind.Utc);
        }

        if (normalized > DateTime.UtcNow)
        {
            throw new ArgumentException("Last login timestamp cannot be in the future.", nameof(lastLoginAtUtc));
        }

        return normalized;
    }
}
