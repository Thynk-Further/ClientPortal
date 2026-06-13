using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetClientPortalQuotationsQuery(
    int Page,
    int PageSize,
    QuoteStatus? Status) : IRequest<Result<GetQuotesResultDto>>;
