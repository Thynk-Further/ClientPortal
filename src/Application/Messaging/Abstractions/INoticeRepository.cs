using Application.Messaging.Dtos;
using Domain;
using Shared;

namespace Application.Messaging.Abstractions;

public interface INoticeRepository
{
    Task<Notice?> FindByIdAsync(Guid noticeId, CancellationToken cancellationToken = default);

    Task<PagedResult<NoticeListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        Guid? clientId,
        bool activeOnly,
        CancellationToken cancellationToken = default);

    void Add(Notice notice);

    void Update(Notice notice);
}
