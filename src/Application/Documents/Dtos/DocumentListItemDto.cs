using Domain;

namespace Application.Documents.Dtos;

public sealed record DocumentListItemDto(
    Guid Id,
    Guid ClientId,
    Guid? ProjectId,
    string Name,
    string Type,
    string S3Key,
    int CurrentVersion,
    DocumentStatus Status,
    IReadOnlyCollection<string> Tags,
    Guid UploadedBy,
    DateTime CreatedAtUtc,
    DateTime UpdatedAtUtc);
