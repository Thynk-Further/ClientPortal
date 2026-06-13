using Application.Invoices;
using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record CreateQuotationFromRfqCommand(
    Guid RfqId,
    Guid ClientId,
    string QuoteNumber,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null) : IRequest<Result<QuoteDto>>;
