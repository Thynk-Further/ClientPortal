using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record GetInvoiceByIdQuery(Guid InvoiceId, Guid ClientId) : IRequest<Result<InvoiceDto>>;
