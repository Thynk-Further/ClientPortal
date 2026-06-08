namespace Infrastructure.Tenancy;

public sealed class TenantPublicIdHeaderOptions
{
    public const string SectionName = "Tenancy:PublicIdHeader";

    public bool Enabled { get; set; }

    public string HeaderName { get; set; } = "X-Tenant-Id";
}
