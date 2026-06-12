using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record SendQuoteCommand(Guid QuoteId, Guid ClientId) : IRequest<Result>;
