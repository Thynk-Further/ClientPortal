using Application.Documents.Dtos;
using MediatR;
using Shared;

namespace Application.Documents;

public sealed record GetUploadPresignedUrlCommand(
    Guid ClientId,
    Guid? ProjectId,
    string Name,
    string Type,
    IReadOnlyCollection<string>? Tags,
    Guid UploadedBy) : IRequest<Result<GetUploadPresignedUrlResultDto>>;
