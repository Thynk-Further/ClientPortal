using Domain;

namespace Application.Documents.Abstractions;

public interface IContractDownloadUrlService
{
    Task<DocumentDownloadUrlIssueResult> IssuePresignedGetUrlAsync(
        Contract contract,
        TimeSpan expiry,
        CancellationToken cancellationToken);
}
