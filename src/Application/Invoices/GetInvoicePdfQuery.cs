using Application.Invoices.Abstractions;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record GetInvoicePdfQuery(Guid InvoiceId, Guid ClientId) : IRequest<Result<InvoicePdfDocument>>;
