using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record SubmitClientPortalInvoicePaymentCommand(
    Guid InvoiceId,
    decimal Amount,
    string Currency,
    string Method,
    string Reference,
    Guid ProofDocumentId,
    string? GatewayProvider = null,
    string? GatewayReference = null) : IRequest<Result<InvoicePaymentSubmissionDto>>;
