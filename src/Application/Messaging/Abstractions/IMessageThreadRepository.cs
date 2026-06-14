using Application.Messaging.Dtos;
using Domain;
using Shared;

namespace Application.Messaging.Abstractions;

public interface IMessageThreadRepository
{
    Task<MessageThread?> FindByIdAsync(Guid threadId, CancellationToken cancellationToken = default);

    Task<PagedResult<MessageThreadListItemDto>> GetPagedForParticipantAsync(
        Guid participantId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<PagedResult<MessageThreadListItemDto>> GetPagedForClientAsync(
        Guid clientId,
        Guid participantId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    void Add(MessageThread thread);

    void Update(MessageThread thread);
}
