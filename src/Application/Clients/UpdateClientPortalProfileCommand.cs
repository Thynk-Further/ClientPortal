using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record UpdateClientPortalProfileCommand(
    string ContactName,
    string Phone) : IRequest<Result<ClientPortalProfileDto>>;
