namespace Application.Documents.Dtos;

public sealed record GetDocumentDownloadUrlResultDto(
    Guid DocumentId,
    string DownloadUrl,
    DateTime ExpiresAtUtc);
