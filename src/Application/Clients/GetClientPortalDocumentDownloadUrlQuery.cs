using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalDocumentDownloadUrlQuery(Guid DocumentId)
    : IRequest<Result<ClientPortalDocumentDownloadDto>>;
