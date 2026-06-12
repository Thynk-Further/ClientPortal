using Domain;

namespace Application.Clients.Dtos;

public sealed record ClientPortalDocumentListItemDto(
    Guid Id,
    string Name,
    string Kind,
    ContractStatus Status,
    DateTime UpdatedAtUtc,
    bool RequiresSignature);

public sealed record ClientPortalDocumentsResultDto(
    IReadOnlyList<ClientPortalDocumentListItemDto> Documents);

public sealed record ClientPortalDocumentDetailDto(
    Guid Id,
    string Name,
    string Kind,
    ContractStatus Status,
    DateTime? SignedAtUtc,
    DateTime? ExpiresAtUtc,
    IReadOnlyCollection<string> Parties,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc,
    bool RequiresSignature,
    bool CanDownload);

public sealed record ClientPortalDocumentDownloadDto(
    string DownloadUrl,
    DateTime ExpiresAtUtc);
