namespace Domain;

public sealed record MessageAttachmentMetadata(
    string FileName,
    string ContentType,
    long SizeBytes,
    string Url);
