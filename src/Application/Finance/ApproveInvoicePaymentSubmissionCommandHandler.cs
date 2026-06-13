using Application.Abstractions;
using Application.Finance.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class ApproveInvoicePaymentSubmissionCommandHandler
    : IRequestHandler<ApproveInvoicePaymentSubmissionCommand, Result>
{
    private static readonly Error SubmissionNotFoundError = new(
        "Finance.SubmissionNotFound",
        "Payment submission was not found.",
        ErrorType.NotFound);

    private static readonly Error SubmissionInvalidStateError = new(
        "Finance.SubmissionInvalidState",
        "Payment submission cannot be approved in its current state.",
        ErrorType.Conflict);

    private static readonly Error InvoiceNotFoundError = new("Invoices.NotFound", "Invoice was not found.", ErrorType.NotFound);

    private readonly ICurrentUser _currentUser;
    private readonly IInvoicePaymentSubmissionRepository _submissionRepository;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IPaymentRepository _paymentRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ApproveInvoicePaymentSubmissionCommandHandler(
        ICurrentUser currentUser,
        IInvoicePaymentSubmissionRepository submissionRepository,
        IInvoiceRepository invoiceRepository,
        IPaymentRepository paymentRepository,
        IUnitOfWork unitOfWork)
    {
        _currentUser = currentUser;
        _submissionRepository = submissionRepository;
        _invoiceRepository = invoiceRepository;
        _paymentRepository = paymentRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(ApproveInvoicePaymentSubmissionCommand request, CancellationToken cancellationToken)
    {
        if (!_currentUser.UserId.HasValue)
        {
            return Result.Failure(new Error("Auth.Unauthorized", "Authenticated user is required.", ErrorType.Forbidden));
        }

        InvoicePaymentSubmission? submission = await _submissionRepository.FindByIdAsync(request.SubmissionId, cancellationToken);
        if (submission is null)
        {
            return Result.Failure(SubmissionNotFoundError);
        }

        Invoice? invoice = await _invoiceRepository.FindByIdAsync(submission.InvoiceId, cancellationToken);
        if (invoice is null)
        {
            return Result.Failure(InvoiceNotFoundError);
        }

        try
        {
            submission.Approve(_currentUser.UserId.Value, DateTime.UtcNow);
            invoice.RecordPayment(submission.Amount, DateTime.UtcNow);

            Payment payment = Payment.Create(
                Guid.CreateVersion7(),
                invoice.Id,
                submission.Amount,
                submission.Currency,
                submission.Method,
                submission.Reference,
                DateTime.UtcNow,
                notes: null,
                submissionId: submission.Id);

            _paymentRepository.Add(payment);
        }
        catch (InvalidOperationException)
        {
            return Result.Failure(SubmissionInvalidStateError);
        }

        _submissionRepository.Update(submission);
        _invoiceRepository.Update(invoice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
