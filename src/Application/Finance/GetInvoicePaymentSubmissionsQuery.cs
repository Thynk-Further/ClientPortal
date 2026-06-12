using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetInvoicePaymentSubmissionsQuery(Guid InvoiceId, Guid ClientId)
    : IRequest<Result<IReadOnlyList<InvoicePaymentSubmissionDto>>>;
