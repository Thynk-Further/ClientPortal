namespace Application.Tenancy.Dtos;

public sealed record TenantBrandingDto(
    Guid TenantId,
    string TenantName,
    string Slug,
    string? LogoUrl,
    string BrandColour,
    string CustomDomain,
    bool CustomDomainEnabled,
    IReadOnlyDictionary<string, string> CssVariables);
