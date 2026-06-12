using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalInvoicesQuery : IRequest<Result<ClientPortalInvoicesResultDto>>;
