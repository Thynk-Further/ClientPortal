using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalMeetingsQuery : IRequest<Result<ClientPortalMeetingsResultDto>>;
