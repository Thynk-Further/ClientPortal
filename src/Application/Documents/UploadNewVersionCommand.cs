using MediatR;
using Shared;

namespace Application.Documents;

public sealed record UploadNewVersionCommand(
    Guid DocumentId,
    Guid ClientId,
    string S3Key,
    Guid UploadedBy,
    string? ChangeNotes = null,
    DateTime? UploadedAtUtc = null) : IRequest<Result<int>>;
