using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientWorkspaceQuery(Guid ClientId) : IRequest<Result<ClientWorkspaceDto>>;
