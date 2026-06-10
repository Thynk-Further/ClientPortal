namespace Api.Tenancy;

public static class TenantHttpContextKeys
{
    public const string TenantId = "__tenant_id";
    public const string TenantSlug = "__tenant_slug";
    public const string TenantSettings = "__tenant_settings";
    public const string TenantPublicId = "__tenant_public_id";
}
