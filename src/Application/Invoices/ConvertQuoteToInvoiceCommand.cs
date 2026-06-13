using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record ConvertQuoteToInvoiceCommand(
    Guid QuoteId,
    Guid? ClientId,
    string InvoiceNumber,
    DateOnly DueDate) : IRequest<Result<InvoiceDto>>;
