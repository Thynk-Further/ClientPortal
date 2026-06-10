using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalInvoiceByIdQuery(Guid InvoiceId)
    : IRequest<Result<ClientPortalInvoiceDetailDto>>;
