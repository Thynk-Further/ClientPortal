namespace Infrastructure.Messaging;

public sealed class MessageAttachmentUploadOptions
{
    public const string SectionName = "MessagingAttachments";

    public string UploadBaseUrl { get; set; } = "https://uploads.clientportal.local";

    public string PublicFileBaseUrl { get; set; } = "https://files.clientportal.local";
}
