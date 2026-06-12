using MediatR;
using Shared;

namespace Application.Finance;

public sealed record ApproveInvoicePaymentSubmissionCommand(Guid SubmissionId) : IRequest<Result>;
