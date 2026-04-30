using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record DeleteInvoiceCommand(Guid InvoiceId, Guid ClientId) : IRequest<Result>;
