using Shared;

namespace Domain;

public sealed class UserNotificationPreferences : Entity<Guid>
{
    public Guid UserId { get; private set; }

    public bool EmailEnabled { get; private set; }

    public bool WhatsAppEnabled { get; private set; }

    public bool SmsEnabled { get; private set; }

    public bool InAppEnabled { get; private set; }

    public NotificationPreferenceFrequency Frequency { get; private set; }

    private UserNotificationPreferences()
    {
    }

    private UserNotificationPreferences(
        Guid id,
        Guid userId,
        bool emailEnabled,
        bool whatsAppEnabled,
        bool smsEnabled,
        bool inAppEnabled,
        NotificationPreferenceFrequency frequency)
        : base(id)
    {
        UserId = NormalizeId(userId, nameof(userId), "UserId");
        EmailEnabled = emailEnabled;
        WhatsAppEnabled = whatsAppEnabled;
        SmsEnabled = smsEnabled;
        InAppEnabled = inAppEnabled;
        Frequency = frequency;
    }

    public static UserNotificationPreferences CreateDefault(Guid userId)
    {
        return new UserNotificationPreferences(
            Guid.CreateVersion7(),
            userId,
            emailEnabled: true,
            whatsAppEnabled: true,
            smsEnabled: true,
            inAppEnabled: true,
            frequency: NotificationPreferenceFrequency.Immediate);
    }

    public static UserNotificationPreferences Create(
        Guid id,
        Guid userId,
        bool emailEnabled,
        bool whatsAppEnabled,
        bool smsEnabled,
        bool inAppEnabled,
        NotificationPreferenceFrequency frequency)
    {
        return new UserNotificationPreferences(id, userId, emailEnabled, whatsAppEnabled, smsEnabled, inAppEnabled, frequency);
    }

    public void Update(
        bool emailEnabled,
        bool whatsAppEnabled,
        bool smsEnabled,
        bool inAppEnabled,
        NotificationPreferenceFrequency frequency)
    {
        EmailEnabled = emailEnabled;
        WhatsAppEnabled = whatsAppEnabled;
        SmsEnabled = smsEnabled;
        InAppEnabled = inAppEnabled;
        Frequency = frequency;
        MarkUpdated();
    }

    private static Guid NormalizeId(Guid value, string paramName, string propertyName)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException($"{propertyName} cannot be empty.", paramName);
        }

        return value;
    }
}
