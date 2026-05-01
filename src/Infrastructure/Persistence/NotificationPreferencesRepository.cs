using Application.Notifications.Abstractions;
using Application.Notifications.Dtos;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public sealed class NotificationPreferencesRepository : INotificationPreferencesRepository
{
    private readonly TenantDbContext _tenantDbContext;

    public NotificationPreferencesRepository(TenantDbContext tenantDbContext)
    {
        _tenantDbContext = tenantDbContext;
    }

    public Task<UserNotificationPreferences?> FindByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _tenantDbContext.Set<UserNotificationPreferences>()
            .SingleOrDefaultAsync(preferences => preferences.UserId == userId, cancellationToken);
    }

    public async Task<NotificationPreferencesDto> GetOrDefaultAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        UserNotificationPreferences? existing = await FindByUserIdAsync(userId, cancellationToken);
        if (existing is null)
        {
            UserNotificationPreferences defaults = UserNotificationPreferences.CreateDefault(userId);
            return Map(defaults);
        }

        return Map(existing);
    }

    public void Add(UserNotificationPreferences preferences)
    {
        _tenantDbContext.Set<UserNotificationPreferences>().Add(preferences);
    }

    public void Update(UserNotificationPreferences preferences)
    {
        _tenantDbContext.Set<UserNotificationPreferences>().Update(preferences);
    }

    private static NotificationPreferencesDto Map(UserNotificationPreferences preferences)
    {
        return new NotificationPreferencesDto(
            preferences.EmailEnabled,
            preferences.WhatsAppEnabled,
            preferences.SmsEnabled,
            preferences.InAppEnabled,
            preferences.Frequency);
    }
}
