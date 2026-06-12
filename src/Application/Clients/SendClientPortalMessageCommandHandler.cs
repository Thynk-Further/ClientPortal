using Application.Abstractions;
using Application.Messaging;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class SendClientPortalMessageCommandHandler
    : IRequestHandler<SendClientPortalMessageCommand, Result<Guid>>
{
    private const string ClientSenderRole = "ClientUser";

    private readonly ICurrentUser _currentUser;
    private readonly ISender _sender;

    public SendClientPortalMessageCommandHandler(ICurrentUser currentUser, ISender sender)
    {
        _currentUser = currentUser;
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

        return await _sender.Send(
            new SendMessageCommand(
                request.ThreadId,
                _currentUser.UserId.Value,
                ClientSenderRole,
                request.ClientMessageId,
                request.Content,
                ReplyToMessageId: null,
                EmojiReaction: null,
                Attachment: null),
            cancellationToken);
    }
}
