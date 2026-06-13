using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;
using Shared;

namespace Infrastructure.Persistence;

public sealed class MessageThreadRepository : IMessageThreadRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public MessageThreadRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<MessageThread?> FindByIdAsync(Guid threadId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<MessageThread>()
            .SingleOrDefaultAsync(thread => thread.Id == threadId, cancellationToken);
    }

    public async Task<PagedResult<MessageThreadListItemDto>> GetPagedForParticipantAsync(
        Guid participantId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        List<MessageThread> participantThreads = (await _tenantDbContext.Set<MessageThread>()
            .OrderByDescending(thread => thread.LastMessageAt)
            .ToListAsync(cancellationToken))
            .Where(thread => thread.Participants.Contains(participantId))
            .ToList();

        int totalCount = participantThreads.Count;
        IReadOnlyList<Guid> pageThreadIds = participantThreads
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(thread => thread.Id)
            .ToList();

        Dictionary<Guid, int> unreadCounts = await _tenantDbContext.Set<Message>()
            .Where(message =>
                pageThreadIds.Contains(message.ThreadId)
                && message.SenderId != participantId
                && message.Status != MessageStatus.Read)
            .GroupBy(message => message.ThreadId)
            .Select(group => new { ThreadId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(entry => entry.ThreadId, entry => entry.Count, cancellationToken);

        IReadOnlyList<MessageThreadListItemDto> items = participantThreads
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(thread => new MessageThreadListItemDto(
                thread.Id,
                thread.ClientId,
                thread.ProjectId,
                thread.Subject,
                thread.LastMessageAt,
                unreadCounts.GetValueOrDefault(thread.Id, 0)))
            .ToList();

        return new PagedResult<MessageThreadListItemDto>(items, totalCount, page, pageSize);
    }

    public async Task<PagedResult<MessageThreadListItemDto>> GetPagedForClientAsync(
        Guid clientId,
        Guid participantId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default)
    {
        List<MessageThread> clientThreads = (await _tenantDbContext.Set<MessageThread>()
            .Where(thread => thread.ClientId == clientId)
            .OrderByDescending(thread => thread.LastMessageAt)
            .ToListAsync(cancellationToken))
            .ToList();

        int totalCount = clientThreads.Count;
        IReadOnlyList<Guid> pageThreadIds = clientThreads
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(thread => thread.Id)
            .ToList();

        Dictionary<Guid, int> unreadCounts = await _tenantDbContext.Set<Message>()
            .Where(message =>
                pageThreadIds.Contains(message.ThreadId)
                && message.SenderId != participantId
                && message.Status != MessageStatus.Read)
            .GroupBy(message => message.ThreadId)
            .Select(group => new { ThreadId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(entry => entry.ThreadId, entry => entry.Count, cancellationToken);

        IReadOnlyList<MessageThreadListItemDto> items = clientThreads
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(thread => new MessageThreadListItemDto(
                thread.Id,
                thread.ClientId,
                thread.ProjectId,
                thread.Subject,
                thread.LastMessageAt,
                unreadCounts.GetValueOrDefault(thread.Id, 0)))
            .ToList();

        return new PagedResult<MessageThreadListItemDto>(items, totalCount, page, pageSize);
    }

    public void Add(MessageThread thread)
    {
        _tenantDbContext.Set<MessageThread>().Add(thread);
    }

    public void Update(MessageThread thread)
    {
        _tenantDbContext.Set<MessageThread>().Update(thread);
    }
}
