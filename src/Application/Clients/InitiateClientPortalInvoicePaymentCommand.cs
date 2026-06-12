using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record InitiateClientPortalInvoicePaymentCommand(
    Guid InvoiceId,
    string CallbackUrl,
    string? Provider = null) : IRequest<Result<ClientPortalInvoicePaymentSessionDto>>;
