using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalDocumentByIdQuery(Guid DocumentId)
    : IRequest<Result<ClientPortalDocumentDetailDto>>;
