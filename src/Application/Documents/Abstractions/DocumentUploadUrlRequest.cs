namespace Application.Documents.Abstractions;

public sealed record DocumentUploadUrlRequest(
    Guid DocumentId,
    Guid ClientId,
    Guid? ProjectId,
    string Name,
    string Type);
