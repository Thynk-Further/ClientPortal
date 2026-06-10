namespace Infrastructure.Documents;

public sealed class DocumentStorageOptions
{
    public const string SectionName = "Documents:Storage";

    public string PublicFileBaseUrl { get; set; } = "https://files.clientportal.local";
}
