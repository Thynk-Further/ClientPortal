namespace Infrastructure.Tenancy;

public sealed class TenantBrandingStorageOptions
{
    public const string SectionName = "Tenancy:BrandingStorage";

    public string PublicFileBaseUrl { get; set; } = "https://files.clientportal.local";
}
