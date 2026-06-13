using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record UpdateQuoteCommand(
    Guid QuoteId,
    Guid? ClientId,
    string QuoteNumber,
    string Currency,
    DateOnly DueDate,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null,
    string? RecipientCompanyName = null,
    string? RecipientContactName = null,
    string? RecipientEmail = null,
    string? RecipientPhone = null) : IRequest<Result>;
