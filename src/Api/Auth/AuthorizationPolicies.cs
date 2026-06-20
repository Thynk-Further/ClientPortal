namespace Api.Auth;

public static class AuthorizationPolicies
{
    public const string RequireOwner = nameof(RequireOwner);
    public const string RequireAdmin = nameof(RequireAdmin);
    public const string RequireOwnerOrAdmin = nameof(RequireOwnerOrAdmin);
    public const string RequireStaff = nameof(RequireStaff);
    public const string RequireAnyStaff = nameof(RequireAnyStaff);
    public const string RequireClientUser = nameof(RequireClientUser);
    public const string RequireTenantAccess = nameof(RequireTenantAccess);
}
