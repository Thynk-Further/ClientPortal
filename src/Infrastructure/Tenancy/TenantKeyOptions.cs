namespace Infrastructure.Tenancy;

public sealed class TenantKeyOptions
{
    public const string SectionName = "Tenancy:TenantKey";

    public bool Enabled { get; set; }

    public string HeaderName { get; set; } = "X-Tenant-Key";

    public string Pepper { get; set; } = string.Empty;
}
