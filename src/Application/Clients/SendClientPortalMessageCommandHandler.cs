using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Messaging;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class SendClientPortalMessageCommandHandler
    : IRequestHandler<SendClientPortalMessageCommand, Result<Guid>>
{
    private readonly ICurrentUser _currentUser;
    private readonly IClientPortalThreadAccessService _threadAccessService;
    private readonly ISender _sender;

    public SendClientPortalMessageCommandHandler(
        ICurrentUser currentUser,
        IClientPortalThreadAccessService threadAccessService,
        ISender sender)
    {
        _currentUser = currentUser;
        _threadAccessService = threadAccessService;
        _sender = sender;
    }

    public async Task<Result<Guid>> Handle(
        SendClientPortalMessageCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<Guid>.Failure(new Error(
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
            return Result<Guid>.Failure(accessResult.Errors);
        }

        string senderRole = ResolveClientSenderRole(_currentUser.Role);

        return await _sender.Send(
            new SendMessageCommand(
                request.ThreadId,
                _currentUser.UserId.Value,
                senderRole,
                request.ClientMessageId,
                request.Content,
                ReplyToMessageId: null,
                EmojiReaction: null,
                Attachment: request.Attachment),
            cancellationToken);
    }

    private static string ResolveClientSenderRole(string? role)
    {
        if (string.Equals(role, Role.ClientAdmin.ToString(), StringComparison.Ordinal))
        {
            return Role.ClientAdmin.ToString();
        }

        return Role.ClientUser.ToString();
    }
}
