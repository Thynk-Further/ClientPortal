using Domain;

namespace Application.Messaging.Abstractions;

public interface INoticeReadReceiptRepository
{
    Task<NoticeReadReceipt?> FindByNoticeAndUserAsync(
        Guid noticeId,
        Guid userId,
        CancellationToken cancellationToken = default);

    void Add(NoticeReadReceipt receipt);
}
