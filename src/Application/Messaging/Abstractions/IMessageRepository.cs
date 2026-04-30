using Application.Messaging.Dtos;
using Domain;
using Shared;

namespace Application.Messaging.Abstractions;

public interface IMessageRepository
{
    Task<Message?> FindByIdAsync(Guid messageId, CancellationToken cancellationToken = default);

    Task<Message?> FindByClientMessageIdAsync(
        Guid threadId,
        string clientMessageId,
        CancellationToken cancellationToken = default);

    Task<long> GetNextSequenceNumberAsync(Guid threadId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Message>> GetUnreadMessagesForReaderAsync(
        Guid threadId,
        Guid readerId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Message>> GetUndeliveredMessagesForRecipientAsync(
        Guid threadId,
        Guid recipientId,
        CancellationToken cancellationToken = default);

    Task<PagedResult<MessageHistoryItemDto>> GetPagedByThreadAsync(
        Guid threadId,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Message>> GetByThreadAfterSequenceAsync(
        Guid threadId,
        long afterSequenceNumber,
        CancellationToken cancellationToken = default);

    void Add(Message message);
}
