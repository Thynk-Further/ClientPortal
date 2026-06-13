using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record CreateExternalQuoteCommand(
    string QuoteNumber,
    string Currency,
    DateOnly DueDate,
    string RecipientCompanyName,
    string? RecipientContactName,
    string? RecipientEmail,
    string? RecipientPhone,
    IReadOnlyCollection<CreateInvoiceLineItemInput> LineItems,
    string? Notes = null) : IRequest<Result<QuoteDto>>;
