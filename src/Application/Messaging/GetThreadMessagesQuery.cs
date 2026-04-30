using Application.Messaging.Dtos;
using MediatR;
using Shared;

namespace Application.Messaging;

public sealed record GetThreadMessagesQuery(
    Guid ThreadId,
    Guid ParticipantId,
    int Page = 1,
    int PageSize = 50,
    bool IncludeSoftDeleted = false) : IRequest<Result<PagedResult<MessageHistoryItemDto>>>;
