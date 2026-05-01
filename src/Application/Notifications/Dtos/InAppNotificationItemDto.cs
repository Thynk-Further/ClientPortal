namespace Application.Notifications.Dtos;

public sealed record InAppNotificationItemDto(
    Guid Id,
    string Title,
    string Body,
    string MetadataJson,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt);
