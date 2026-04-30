namespace Application.Messaging.Dtos;

public sealed record MessageAttachmentMetadataDto(
    string FileName,
    string ContentType,
    long SizeBytes,
    string Url);
