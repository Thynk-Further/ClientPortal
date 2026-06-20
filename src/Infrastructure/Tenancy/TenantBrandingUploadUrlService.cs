using Application.Tenancy.Abstractions;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;

namespace Infrastructure.Tenancy;

public sealed class TenantBrandingUploadUrlService : ITenantBrandingUploadUrlService
{
    private readonly TenantBrandingStorageOptions _options;

    public TenantBrandingUploadUrlService(IOptions<TenantBrandingStorageOptions> options)
    {
        _options = options.Value;
    }

    public Task<TenantBrandingUploadUrlIssueResult> IssueLogoUploadUrlAsync(
        TenantBrandingUploadUrlRequest request,
        CancellationToken cancellationToken = default)
    {
        _ = cancellationToken;

        DateTime expiresAtUtc = DateTime.UtcNow.AddMinutes(15);
        string extension = Path.GetExtension(request.FileName);
        string objectKey = $"tenants/{request.TenantId:D}/branding/logo{extension}";
        string escapedKey = Uri.EscapeDataString(objectKey);
        string token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        string uploadUrl =
            $"{_options.PublicFileBaseUrl.TrimEnd('/')}/put/{escapedKey}?token={token}&expires={expiresAtUtc:O}";
        string logoUrl = $"{_options.PublicFileBaseUrl.TrimEnd('/')}/{objectKey}";

        return Task.FromResult(new TenantBrandingUploadUrlIssueResult(uploadUrl, logoUrl, expiresAtUtc));
    }
}
