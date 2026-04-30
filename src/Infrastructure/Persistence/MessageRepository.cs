using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class MessageRepository : IMessageRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public MessageRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<Message?> FindByIdAsync(Guid messageId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<Message>()
            .SingleOrDefaultAsync(message => message.Id == messageId, cancellationToken);
    }

    public Task<Message?> FindByClientMessageIdAsync(
        Guid threadId,
        string clientMessageId,
        CancellationToken cancellationToken = default)
    {
        string normalizedClientMessageId = clientMessageId.Trim();
        return _tenantDbContext.Set<Message>()
            .SingleOrDefaultAsync(
                message => message.ThreadId == threadId && message.ClientMessageId == normalizedClientMessageId,
                cancellationToken);
    }

    public async Task<long> GetNextSequenceNumberAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        long? currentMax = await _tenantDbContext.Set<Message>()
            .Where(message => message.ThreadId == threadId)
            .Select(message => (long?)message.SequenceNumber)
            .MaxAsync(cancellationToken);

        return (currentMax ?? 0L) + 1L;
    }

    public async Task<IReadOnlyList<Message>> GetUnreadMessagesForReaderAsync(
        Guid threadId,
        Guid readerId,
        CancellationToken cancellationToken = default)
    {
        return await _tenantDbContext.Set<Message>()
            .Where(message =>
                message.ThreadId == threadId
                && message.SenderId != readerId
                && message.Status != MessageStatus.Read)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Message>> GetUndeliveredMessagesForRecipientAsync(
        Guid threadId,
        Guid recipientId,
        CancellationToken cancellationToken = default)
    {
        return await _tenantDbContext.Set<Message>()
            .Where(message =>
                message.ThreadId == threadId
                && message.SenderId != recipientId
                && message.Status == MessageStatus.Sent)
            .ToListAsync(cancellationToken);
    }

    public async Task<PagedResult<MessageHistoryItemDto>> GetPagedByThreadAsync(
        Guid threadId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        IQueryable<Message> baseQuery = _tenantDbContext.Set<Message>()
            .AsNoTracking()
            .Where(message => message.ThreadId == threadId);

        int totalCount = await baseQuery.CountAsync(cancellationToken);

        IReadOnlyList<MessageHistoryItemDto> items = await baseQuery
            .OrderByDescending(message => message.SequenceNumber)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .OrderBy(message => message.SequenceNumber)
            .Select(message => new MessageHistoryItemDto(
                message.Id,
                message.ThreadId,
                message.SenderId,
                message.SenderRole,
                message.ClientMessageId,
                message.SequenceNumber,
                message.Content,
                message.Status,
                message.SentAt,
                message.DeliveredAt,
                message.ReadAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<MessageHistoryItemDto>(items, totalCount, page, pageSize);
    }

    public async Task<IReadOnlyList<Message>> GetByThreadAfterSequenceAsync(
        Guid threadId,
        long afterSequenceNumber,
        CancellationToken cancellationToken = default)
    {
        return await _tenantDbContext.Set<Message>()
            .AsNoTracking()
            .Where(message => message.ThreadId == threadId && message.SequenceNumber > afterSequenceNumber)
            .OrderBy(message => message.SequenceNumber)
            .ToListAsync(cancellationToken);
    }

    public void Add(Message message)
    {
        _tenantDbContext.Set<Message>().Add(message);
    }
}
