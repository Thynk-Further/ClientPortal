namespace Application.Documents.Abstractions;

public interface IDocumentUploadUrlService
{
    Task<DocumentUploadUrlIssueResult> IssuePresignedPutUrlAsync(
        DocumentUploadUrlRequest request,
        CancellationToken cancellationToken);
}
