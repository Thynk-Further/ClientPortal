using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalProjectsQuery : IRequest<Result<ClientPortalProjectsResultDto>>;
