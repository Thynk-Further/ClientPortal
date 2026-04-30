using Application.Abstractions;
using Application.Messaging.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class DeleteNoticeCommandHandler : IRequestHandler<DeleteNoticeCommand, Result>
{
    private static readonly Error NoticeNotFoundError = new(
        "Notices.NotFound",
        "Notice was not found.",
        ErrorType.NotFound);

    private readonly INoticeRepository _noticeRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteNoticeCommandHandler(
        INoticeRepository noticeRepository,
        IUnitOfWork unitOfWork)
    {
        _noticeRepository = noticeRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteNoticeCommand request, CancellationToken cancellationToken)
    {
        Notice? notice = await _noticeRepository.FindByIdAsync(request.NoticeId, cancellationToken);
        if (notice is null)
        {
            return Result.Failure(NoticeNotFoundError);
        }

        notice.Deactivate();
        _noticeRepository.Update(notice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
