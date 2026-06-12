using Application.Abstractions;
using Application.Notifications;
using Application.Notifications.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalNotificationPreferencesQueryHandler
    : IRequestHandler<GetClientPortalNotificationPreferencesQuery, Result<NotificationPreferencesDto>>
{
    private readonly ICurrentUser _currentUser;
    private readonly ISender _sender;

    public GetClientPortalNotificationPreferencesQueryHandler(ICurrentUser currentUser, ISender sender)
    {
        _currentUser = currentUser;
        _sender = sender;
    }

    public async Task<Result<NotificationPreferencesDto>> Handle(
        GetClientPortalNotificationPreferencesQuery request,
        CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is null)
        {
            return Result<NotificationPreferencesDto>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        return await _sender.Send(
            new GetNotificationPreferencesQuery(_currentUser.UserId.Value),
            cancellationToken);
    }
}
