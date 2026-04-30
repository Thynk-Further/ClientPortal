using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record UpdateQuoteCommand(
    Guid QuoteId,
    Guid ClientId,
    string QuoteNumber,
    string Currency,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null) : IRequest<Result>;
