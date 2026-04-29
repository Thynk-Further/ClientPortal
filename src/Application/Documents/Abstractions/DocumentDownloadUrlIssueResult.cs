namespace Application.Documents.Abstractions;

public sealed record DocumentDownloadUrlIssueResult(
    string DownloadUrl,
    DateTime ExpiresAtUtc);
