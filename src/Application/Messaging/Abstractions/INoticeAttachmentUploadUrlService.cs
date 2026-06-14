using Application.Messaging.Dtos;

namespace Application.Messaging.Abstractions;

public interface INoticeAttachmentUploadUrlService
{
    Task<MessageAttachmentUploadUrlResultDto> IssueUploadUrlAsync(
        Guid userId,
        MessageAttachmentMetadataDto attachment,
        CancellationToken cancellationToken = default);
}
