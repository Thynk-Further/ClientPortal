using MediatR;
using Shared;

namespace Application.Finance;

public sealed record RejectInvoicePaymentSubmissionCommand(
    Guid SubmissionId,
    string? ReviewNotes) : IRequest<Result>;
