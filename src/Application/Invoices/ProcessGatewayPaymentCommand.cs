using Application.Abstractions;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record ProcessGatewayPaymentCommand(
    string Provider,
    string Payload,
    string Signature) : IRequest<Result>, ITenantOptionalRequest;
