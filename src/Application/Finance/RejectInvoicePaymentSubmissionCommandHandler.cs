using Application.Abstractions;
using Application.Finance.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class RejectInvoicePaymentSubmissionCommandHandler
    : IRequestHandler<RejectInvoicePaymentSubmissionCommand, Result>
{
    private static readonly Error SubmissionNotFoundError = new(
        "Finance.SubmissionNotFound",
        "Payment submission was not found.",
        ErrorType.NotFound);

    private static readonly Error SubmissionInvalidStateError = new(
        "Finance.SubmissionInvalidState",
        "Payment submission cannot be rejected in its current state.",
        ErrorType.Conflict);

    private readonly ICurrentUser _currentUser;
    private readonly IInvoicePaymentSubmissionRepository _submissionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public RejectInvoicePaymentSubmissionCommandHandler(
        ICurrentUser currentUser,
        IInvoicePaymentSubmissionRepository submissionRepository,
        IUnitOfWork unitOfWork)
    {
        _currentUser = currentUser;
        _submissionRepository = submissionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(RejectInvoicePaymentSubmissionCommand request, CancellationToken cancellationToken)
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

        try
        {
            submission.Reject(_currentUser.UserId.Value, DateTime.UtcNow, request.ReviewNotes);
        }
        catch (InvalidOperationException)
        {
            return Result.Failure(SubmissionInvalidStateError);
        }

        _submissionRepository.Update(submission);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
