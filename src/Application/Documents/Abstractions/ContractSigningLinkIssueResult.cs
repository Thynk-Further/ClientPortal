namespace Application.Documents.Abstractions;

public sealed record ContractSigningLinkIssueResult(
    string SigningUrl,
    DateTime ExpiresAtUtc);
