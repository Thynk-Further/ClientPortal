using Application.Documents.Abstractions;
using Domain;
using Microsoft.Extensions.Options;

namespace Infrastructure.Documents;

public sealed class ContractDownloadUrlService : IContractDownloadUrlService
{
    private static readonly TimeSpan DefaultExpiry = TimeSpan.FromMinutes(15);

    private readonly DocumentStorageOptions _options;

    public ContractDownloadUrlService(IOptions<DocumentStorageOptions> options)
    {
        _options = options.Value;
    }

    public Task<DocumentDownloadUrlIssueResult> IssuePresignedGetUrlAsync(
        Contract contract,
        TimeSpan expiry,
        CancellationToken cancellationToken)
    {
        _ = cancellationToken;

        TimeSpan effectiveExpiry = expiry > TimeSpan.Zero ? expiry : DefaultExpiry;
        DateTime expiresAtUtc = DateTime.UtcNow.Add(effectiveExpiry);
        string escapedKey = Uri.EscapeDataString(contract.S3Key.Trim());
        string downloadUrl =
            $"{_options.PublicFileBaseUrl.TrimEnd('/')}/{escapedKey}?expires={Uri.EscapeDataString(expiresAtUtc.ToString("O"))}";

        return Task.FromResult(new DocumentDownloadUrlIssueResult(downloadUrl, expiresAtUtc));
    }
}
