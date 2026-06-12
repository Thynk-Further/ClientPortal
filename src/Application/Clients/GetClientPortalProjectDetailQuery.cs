using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalProjectDetailQuery(Guid ProjectId)
    : IRequest<Result<ClientPortalProjectDetailDto>>;
