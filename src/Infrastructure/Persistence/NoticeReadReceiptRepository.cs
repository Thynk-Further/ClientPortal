using Application.Messaging.Abstractions;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class NoticeReadReceiptRepository : INoticeReadReceiptRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public NoticeReadReceiptRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<NoticeReadReceipt?> FindByNoticeAndUserAsync(
        Guid noticeId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<NoticeReadReceipt>()
            .SingleOrDefaultAsync(
                receipt => receipt.NoticeId == noticeId && receipt.UserId == userId,
                cancellationToken);
    }

    public void Add(NoticeReadReceipt receipt)
    {
        _tenantDbContext.Set<NoticeReadReceipt>().Add(receipt);
    }
}
