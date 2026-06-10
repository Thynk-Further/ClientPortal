using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Messaging.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class MarkClientPortalNoticeReadCommandHandler
    : IRequestHandler<MarkClientPortalNoticeReadCommand, Result>
{
    private static readonly Error NoticeNotFoundError = new(
        "Notices.NotFound",
        "Notice was not found.",
        ErrorType.NotFound);

    private static readonly Error NoticeForbiddenError = new(
        "Notices.Forbidden",
        "Notice is not available for the current client.",
        ErrorType.Forbidden);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly ICurrentUser _currentUser;
    private readonly INoticeRepository _noticeRepository;
    private readonly INoticeReadReceiptRepository _noticeReadReceiptRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MarkClientPortalNoticeReadCommandHandler(
        ICurrentClientResolver currentClientResolver,
        ICurrentUser currentUser,
        INoticeRepository noticeRepository,
        INoticeReadReceiptRepository noticeReadReceiptRepository,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _currentUser = currentUser;
        _noticeRepository = noticeRepository;
        _noticeReadReceiptRepository = noticeReadReceiptRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(
        MarkClientPortalNoticeReadCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result.Failure(clientIdResult.Errors);
        }

        Notice? notice = await _noticeRepository.FindByIdAsync(request.NoticeId, cancellationToken);
        if (notice is null || !IsVisibleToClient(notice, clientIdResult.Value))
        {
            return notice is null
                ? Result.Failure(NoticeNotFoundError)
                : Result.Failure(NoticeForbiddenError);
        }

        NoticeReadReceipt? existingReceipt = await _noticeReadReceiptRepository.FindByNoticeAndUserAsync(
            request.NoticeId,
            _currentUser.UserId.Value,
            cancellationToken);

        if (existingReceipt is not null)
        {
            return Result.Success();
        }

        NoticeReadReceipt receipt = NoticeReadReceipt.Create(
            Guid.NewGuid(),
            request.NoticeId,
            _currentUser.UserId.Value,
            DateTime.UtcNow);

        _noticeReadReceiptRepository.Add(receipt);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static bool IsVisibleToClient(Notice notice, Guid clientId)
    {
        DateTime nowUtc = DateTime.UtcNow;

        if (!notice.IsActive)
        {
            return false;
        }

        if (notice.ExpiresAt.HasValue && notice.ExpiresAt <= nowUtc)
        {
            return false;
        }

        return notice.TargetClientIds is null || notice.TargetClientIds.Contains(clientId);
    }
}
