using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;

namespace Infrastructure.Messaging;

public sealed class NoticeAttachmentUploadUrlService : INoticeAttachmentUploadUrlService
{
    private readonly MessageAttachmentUploadOptions _options;

    public NoticeAttachmentUploadUrlService(IOptions<MessageAttachmentUploadOptions> options)
    {
        _options = options.Value;
    }

    public Task<MessageAttachmentUploadUrlResultDto> IssueUploadUrlAsync(
        Guid userId,
        MessageAttachmentMetadataDto attachment,
        CancellationToken cancellationToken = default)
    {
        _ = cancellationToken;

        DateTime expiresAtUtc = DateTime.UtcNow.AddMinutes(10);
        string extension = Path.GetExtension(attachment.FileName);
        string objectKey = $"notices/{userId:D}/{Guid.CreateVersion7():D}{extension}";
        string escapedObjectKey = Uri.EscapeDataString(objectKey);
        string token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

        string uploadUrl =
            $"{_options.UploadBaseUrl.TrimEnd('/')}/put/{escapedObjectKey}?token={token}&expires={expiresAtUtc:O}";
        string fileUrl =
            $"{_options.PublicFileBaseUrl.TrimEnd('/')}/{escapedObjectKey}";

        return Task.FromResult(new MessageAttachmentUploadUrlResultDto(uploadUrl, fileUrl, expiresAtUtc));
    }
}
