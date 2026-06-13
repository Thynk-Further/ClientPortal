using Application.Documents.Abstractions;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;

namespace Infrastructure.Documents;

public sealed class DocumentUploadUrlService : IDocumentUploadUrlService
{
    private readonly DocumentStorageOptions _options;

    public DocumentUploadUrlService(IOptions<DocumentStorageOptions> options)
    {
        _options = options.Value;
    }

    public Task<DocumentUploadUrlIssueResult> IssuePresignedPutUrlAsync(
        DocumentUploadUrlRequest request,
        CancellationToken cancellationToken)
    {
        _ = cancellationToken;

        DateTime expiresAtUtc = DateTime.UtcNow.AddMinutes(15);
        string extension = Path.GetExtension(request.Name);
        string s3Key = $"documents/{request.ClientId:D}/{request.ProjectId:D}/{request.DocumentId:D}{extension}";
        string escapedKey = Uri.EscapeDataString(s3Key);
        string token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
        string uploadUrl =
            $"{_options.PublicFileBaseUrl.TrimEnd('/')}/put/{escapedKey}?token={token}&expires={expiresAtUtc:O}";

        return Task.FromResult(new DocumentUploadUrlIssueResult(s3Key, uploadUrl, expiresAtUtc));
    }
}
