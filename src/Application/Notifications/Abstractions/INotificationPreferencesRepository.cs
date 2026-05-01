using Application.Notifications.Dtos;
using Domain;

namespace Application.Notifications.Abstractions;

public interface INotificationPreferencesRepository
{
    Task<UserNotificationPreferences?> FindByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<NotificationPreferencesDto> GetOrDefaultAsync(Guid userId, CancellationToken cancellationToken = default);

    void Add(UserNotificationPreferences preferences);

    void Update(UserNotificationPreferences preferences);
}
