using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalThreadMessagesQuery(
    Guid ThreadId,
    int Page = 1,
    int PageSize = 50) : IRequest<Result<ClientPortalThreadMessagesResultDto>>;
