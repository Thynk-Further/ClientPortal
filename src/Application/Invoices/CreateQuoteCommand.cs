using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record CreateQuoteCommand(
    Guid ClientId,
    Guid ProjectId,
    string QuoteNumber,
    string Currency,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null) : IRequest<Result<QuoteDto>>;
