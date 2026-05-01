namespace Application.Notifications.Abstractions;

public sealed record NotificationMessage(
    NotificationChannel Channel,
    string Recipient,
    string Subject,
    string Body,
    IReadOnlyDictionary<string, string>? Metadata = null);
