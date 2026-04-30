using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record DeleteQuoteCommand(Guid QuoteId, Guid ClientId) : IRequest<Result>;
