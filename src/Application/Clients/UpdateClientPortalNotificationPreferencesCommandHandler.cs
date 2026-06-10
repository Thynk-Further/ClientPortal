using Application.Abstractions;
using Application.Notifications;
using Application.Notifications.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class UpdateClientPortalNotificationPreferencesCommandHandler
    : IRequestHandler<UpdateClientPortalNotificationPreferencesCommand, Result<NotificationPreferencesDto>>
{
    private readonly ICurrentUser _currentUser;
    private readonly ISender _sender;

    public UpdateClientPortalNotificationPreferencesCommandHandler(ICurrentUser currentUser, ISender sender)
    {
        _currentUser = currentUser;
        _sender = sender;
    }

    public async Task<Result<NotificationPreferencesDto>> Handle(
        UpdateClientPortalNotificationPreferencesCommand request,
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
            new UpdateNotificationPreferencesCommand(
                _currentUser.UserId.Value,
                request.EmailEnabled,
                request.WhatsAppEnabled,
                request.SmsEnabled,
                request.InAppEnabled,
                request.Frequency),
            cancellationToken);
    }
}
