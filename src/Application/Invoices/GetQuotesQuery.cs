using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed record GetQuotesQuery(
    int Page = 1,
    int PageSize = 20,
    QuoteStatus? Status = null,
    Guid? ClientId = null,
    DateOnly? DueDateFrom = null,
    DateOnly? DueDateTo = null) : IRequest<Result<GetQuotesResultDto>>;
