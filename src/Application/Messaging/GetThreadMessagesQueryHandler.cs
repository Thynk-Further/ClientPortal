using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed class GetThreadMessagesQueryHandler : IRequestHandler<GetThreadMessagesQuery, Result<PagedResult<MessageHistoryItemDto>>>
{
    private static readonly Error ThreadNotFoundError = new(
        "Messages.ThreadNotFound",
        "Message thread was not found.",
        ErrorType.NotFound);

    private static readonly Error ParticipantNotInThreadError = new(
        "Messages.ParticipantNotInThread",
        "Participant is not allowed to read this thread.",
        ErrorType.Forbidden);

    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly IMessageRepository _messageRepository;

    public GetThreadMessagesQueryHandler(
        IMessageThreadRepository messageThreadRepository,
        IMessageRepository messageRepository)
    {
        _messageThreadRepository = messageThreadRepository;
        _messageRepository = messageRepository;
    }

    public async Task<Result<PagedResult<MessageHistoryItemDto>>> Handle(
        GetThreadMessagesQuery request,
        CancellationToken cancellationToken)
    {
        MessageThread? thread = await _messageThreadRepository.FindByIdAsync(request.ThreadId, cancellationToken);
        if (thread is null)
        {
            return Result<PagedResult<MessageHistoryItemDto>>.Failure(ThreadNotFoundError);
        }

        if (!thread.Participants.Contains(request.ParticipantId))
        {
            return Result<PagedResult<MessageHistoryItemDto>>.Failure(ParticipantNotInThreadError);
        }

        PagedResult<MessageHistoryItemDto> messages = await _messageRepository.GetPagedByThreadAsync(
            threadId: request.ThreadId,
            page: request.Page,
            pageSize: request.PageSize,
            includeSoftDeleted: request.IncludeSoftDeleted,
            cancellationToken: cancellationToken);

        return Result<PagedResult<MessageHistoryItemDto>>.Success(messages);
    }
}
