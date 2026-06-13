using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetClientPortalPaymentProofUploadUrlCommand(
    Guid InvoiceId,
    string FileName,
    string ContentType) : IRequest<Result<ClientPortalPaymentProofUploadUrlDto>>;
