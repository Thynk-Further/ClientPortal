using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalMessageThreadsQuery(
    int Page = 1,
    int PageSize = 20) : IRequest<Result<ClientPortalMessageThreadsResultDto>>;
