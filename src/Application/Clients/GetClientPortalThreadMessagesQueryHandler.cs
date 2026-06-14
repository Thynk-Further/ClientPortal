using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Messaging;
using Application.Messaging.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalThreadMessagesQueryHandler
    : IRequestHandler<GetClientPortalThreadMessagesQuery, Result<ClientPortalThreadMessagesResultDto>>
{
    private readonly ICurrentUser _currentUser;
    private readonly IClientPortalThreadAccessService _threadAccessService;
    private readonly ISender _sender;

    public GetClientPortalThreadMessagesQueryHandler(
        ICurrentUser currentUser,
        IClientPortalThreadAccessService threadAccessService,
        ISender sender)
    {
        _currentUser = currentUser;
        _threadAccessService = threadAccessService;
        _sender = sender;
    }

    public async Task<Result<ClientPortalThreadMessagesResultDto>> Handle(
        GetClientPortalThreadMessagesQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<ClientPortalThreadMessagesResultDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        Result<MessageThread> accessResult = await _threadAccessService.EnsureThreadAccessAsync(
            request.ThreadId,
            _currentUser.UserId.Value,
            addParticipantIfMissing: true,
            cancellationToken);
        if (accessResult.IsFailed)
        {
            return Result<ClientPortalThreadMessagesResultDto>.Failure(accessResult.Errors);
        }

        Result<PagedResult<MessageHistoryItemDto>> messagesResult = await _sender.Send(
            new GetThreadMessagesQuery(
                request.ThreadId,
                _currentUser.UserId.Value,
                request.Page,
                request.PageSize,
                IncludeSoftDeleted: false),
            cancellationToken);

        if (messagesResult.IsFailed || messagesResult.Value is null)
        {
            return Result<ClientPortalThreadMessagesResultDto>.Failure(messagesResult.Errors);
        }

        PagedResult<MessageHistoryItemDto> messages = messagesResult.Value;
        IReadOnlyList<ClientPortalMessageDto> items = messages.Items
            .Where(message => !message.IsSoftDeleted)
            .Select(message => new ClientPortalMessageDto(
                message.Id,
                message.ThreadId,
                message.SenderId,
                message.SenderRole,
                message.Content,
                message.Status,
                message.SentAt,
                message.Attachment,
                message.AttachmentExpiresAt))
            .ToList();

        ClientPortalThreadMessagesResultDto result = new(
            items,
            messages.TotalCount,
            messages.Page,
            messages.PageSize);

        return Result<ClientPortalThreadMessagesResultDto>.Success(result);
    }
}
