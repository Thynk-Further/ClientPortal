using Domain;

namespace Application.Notifications.Dtos;

public sealed record NotificationPreferencesDto(
    bool EmailEnabled,
    bool WhatsAppEnabled,
    bool SmsEnabled,
    bool InAppEnabled,
    NotificationPreferenceFrequency Frequency);
