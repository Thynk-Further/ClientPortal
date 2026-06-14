using Application.Messaging.Dtos;
using Domain;

namespace Application.Messaging;

public static class NoticeMapping
{
    public static NoticeListItemDto ToListItemDto(Notice notice)
    {
        return new NoticeListItemDto(
            notice.Id,
            notice.Title,
            notice.Content,
            notice.PublishedAt,
            notice.ExpiresAt,
            notice.IsActive,
            notice.TargetClientIds,
            ToAttachmentDtos(notice.Attachments));
    }

    public static IReadOnlyCollection<MessageAttachmentMetadataDto>? ToAttachmentDtos(
        IReadOnlyCollection<MessageAttachmentMetadata>? attachments)
    {
        if (attachments is null)
        {
            return null;
        }

        return attachments
            .Select(attachment => new MessageAttachmentMetadataDto(
                attachment.FileName,
                attachment.ContentType,
                attachment.SizeBytes,
                attachment.Url))
            .ToList();
    }
}
