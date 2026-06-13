using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Messaging;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class MarkClientPortalThreadReadCommandHandler
    : IRequestHandler<MarkClientPortalThreadReadCommand, Result<int>>
{
    private readonly ICurrentUser _currentUser;
    private readonly IClientPortalThreadAccessService _threadAccessService;
    private readonly ISender _sender;

    public MarkClientPortalThreadReadCommandHandler(
        ICurrentUser currentUser,
        IClientPortalThreadAccessService threadAccessService,
        ISender sender)
    {
        _currentUser = currentUser;
        _threadAccessService = threadAccessService;
        _sender = sender;
    }

    public async Task<Result<int>> Handle(
        MarkClientPortalThreadReadCommand request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<int>.Failure(new Error(
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
            return Result<int>.Failure(accessResult.Errors);
        }

        return await _sender.Send(
            new MarkThreadReadCommand(request.ThreadId, _currentUser.UserId.Value),
            cancellationToken);
    }
}
