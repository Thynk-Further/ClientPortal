using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class GetNoticeByIdQueryHandler : IRequestHandler<GetNoticeByIdQuery, Result<NoticeListItemDto>>
{
    private static readonly Error NoticeNotFoundError = new(
        "Notices.NotFound",
        "Notice was not found.",
        ErrorType.NotFound);

    private readonly INoticeRepository _noticeRepository;

    public GetNoticeByIdQueryHandler(INoticeRepository noticeRepository)
    {
        _noticeRepository = noticeRepository;
    }

    public async Task<Result<NoticeListItemDto>> Handle(GetNoticeByIdQuery request, CancellationToken cancellationToken)
    {
        Notice? notice = await _noticeRepository.FindByIdAsync(request.NoticeId, cancellationToken);
        if (notice is null)
        {
            return Result<NoticeListItemDto>.Failure(NoticeNotFoundError);
        }

        NoticeListItemDto dto = new(
            notice.Id,
            notice.Title,
            notice.Content,
            notice.PublishedAt,
            notice.ExpiresAt,
            notice.IsActive,
            notice.TargetClientIds);

        return Result<NoticeListItemDto>.Success(dto);
    }
}
