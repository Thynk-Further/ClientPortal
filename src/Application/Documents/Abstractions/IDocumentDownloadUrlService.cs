using Domain;

namespace Application.Documents.Abstractions;

public interface IDocumentDownloadUrlService
{
    Task<DocumentDownloadUrlIssueResult> IssuePresignedGetUrlAsync(
        Document document,
        TimeSpan expiry,
        CancellationToken cancellationToken);
}
