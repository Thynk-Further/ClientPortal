namespace Application.Messaging.Dtos;

public sealed record MessageAttachmentUploadUrlResultDto(
    string UploadUrl,
    string FileUrl,
    DateTime ExpiresAtUtc);
