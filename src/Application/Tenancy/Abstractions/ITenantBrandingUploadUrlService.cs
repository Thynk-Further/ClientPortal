namespace Application.Tenancy.Abstractions;

public sealed record TenantBrandingUploadUrlRequest(
    Guid TenantId,
    string FileName,
    string ContentType);

public sealed record TenantBrandingUploadUrlIssueResult(
    string UploadUrl,
    string LogoUrl,
    DateTime ExpiresAtUtc);

public interface ITenantBrandingUploadUrlService
{
    Task<TenantBrandingUploadUrlIssueResult> IssueLogoUploadUrlAsync(
        TenantBrandingUploadUrlRequest request,
        CancellationToken cancellationToken = default);
}
