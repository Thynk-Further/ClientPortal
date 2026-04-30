using Application.Abstractions;
using Application.Messaging.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class UpdateNoticeCommandHandler : IRequestHandler<UpdateNoticeCommand, Result>
{
    private static readonly Error NoticeNotFoundError = new(
        "Notices.NotFound",
        "Notice was not found.",
        ErrorType.NotFound);

    private readonly INoticeRepository _noticeRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateNoticeCommandHandler(
        INoticeRepository noticeRepository,
        IUnitOfWork unitOfWork)
    {
        _noticeRepository = noticeRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateNoticeCommand request, CancellationToken cancellationToken)
    {
        Notice? notice = await _noticeRepository.FindByIdAsync(request.NoticeId, cancellationToken);
        if (notice is null)
        {
            return Result.Failure(NoticeNotFoundError);
        }

        notice.UpdateDetails(request.Title, request.Content, request.ExpiresAt, request.TargetClientIds);
        if (request.IsActive)
        {
            notice.Activate();
        }
        else
        {
            notice.Deactivate();
        }

        _noticeRepository.Update(notice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
