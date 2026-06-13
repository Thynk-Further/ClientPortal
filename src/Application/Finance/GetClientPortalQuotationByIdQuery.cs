using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetClientPortalQuotationByIdQuery(Guid QuotationId) : IRequest<Result<QuoteDto>>;
