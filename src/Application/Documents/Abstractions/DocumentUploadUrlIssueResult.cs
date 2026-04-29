namespace Application.Documents.Abstractions;

public sealed record DocumentUploadUrlIssueResult(
    string S3Key,
    string UploadUrl,
    DateTime ExpiresAtUtc);
