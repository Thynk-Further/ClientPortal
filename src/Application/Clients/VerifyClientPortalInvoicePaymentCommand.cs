using Application.Clients.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record VerifyClientPortalInvoicePaymentCommand(
    Guid InvoiceId,
    string Provider,
    string TransactionId,
    string Reference) : IRequest<Result<ClientPortalInvoicePaymentVerificationDto>>;
