using Application.Notifications.Abstractions;
using Application.Notifications.Dtos;
using MediatR;
using Shared;

namespace Application.Notifications;

public sealed class GetNotificationPreferencesQueryHandler
    : IRequestHandler<GetNotificationPreferencesQuery, Result<NotificationPreferencesDto>>
{
    private readonly INotificationPreferencesRepository _notificationPreferencesRepository;

    public GetNotificationPreferencesQueryHandler(INotificationPreferencesRepository notificationPreferencesRepository)
    {
        _notificationPreferencesRepository = notificationPreferencesRepository;
    }

    public async Task<Result<NotificationPreferencesDto>> Handle(
        GetNotificationPreferencesQuery request,
        CancellationToken cancellationToken)
    {
        NotificationPreferencesDto preferences = await _notificationPreferencesRepository.GetOrDefaultAsync(request.UserId, cancellationToken);
        return Result<NotificationPreferencesDto>.Success(preferences);
    }
}
