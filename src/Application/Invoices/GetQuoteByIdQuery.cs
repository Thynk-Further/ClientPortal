using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record GetQuoteByIdQuery(Guid QuoteId, Guid ClientId) : IRequest<Result<QuoteDto>>;
