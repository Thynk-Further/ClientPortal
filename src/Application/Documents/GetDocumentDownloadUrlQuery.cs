using Application.Documents.Dtos;
using MediatR;
using Shared;

namespace Application.Documents;

public sealed record GetDocumentDownloadUrlQuery(
    Guid DocumentId,
    Guid ClientId) : IRequest<Result<GetDocumentDownloadUrlResultDto>>;
