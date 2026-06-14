namespace Application.Messaging.Dtos;

public sealed record NoticeListItemDto(
    Guid Id,
    string Title,
    string Content,
    DateTime PublishedAt,
    DateTime? ExpiresAt,
    bool IsActive,
    IReadOnlyCollection<Guid>? TargetClientIds,
    IReadOnlyCollection<MessageAttachmentMetadataDto>? Attachments);
