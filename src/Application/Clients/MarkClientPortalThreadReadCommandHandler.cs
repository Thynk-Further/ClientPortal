using Application.Abstractions;
using Application.Messaging;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class MarkClientPortalThreadReadCommandHandler
    : IRequestHandler<MarkClientPortalThreadReadCommand, Result<int>>
{
    private readonly ICurrentUser _currentUser;
    private readonly ISender _sender;

    public MarkClientPortalThreadReadCommandHandler(ICurrentUser currentUser, ISender sender)
    {
        _currentUser = currentUser;
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

        return await _sender.Send(
            new MarkThreadReadCommand(request.ThreadId, _currentUser.UserId.Value),
            cancellationToken);
    }
}
