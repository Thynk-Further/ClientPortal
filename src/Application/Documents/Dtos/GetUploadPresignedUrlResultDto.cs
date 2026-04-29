namespace Application.Documents.Dtos;

public sealed record GetUploadPresignedUrlResultDto(
    Guid DocumentId,
    string S3Key,
    string UploadUrl,
    DateTime ExpiresAtUtc);
