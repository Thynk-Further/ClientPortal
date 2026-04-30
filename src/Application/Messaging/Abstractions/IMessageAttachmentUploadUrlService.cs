using Application.Messaging.Dtos;

namespace Application.Messaging.Abstractions;

public interface IMessageAttachmentUploadUrlService
{
    Task<MessageAttachmentUploadUrlResultDto> IssueUploadUrlAsync(
        Guid threadId,
        Guid userId,
        MessageAttachmentMetadataDto attachment,
        CancellationToken cancellationToken = default);
}
