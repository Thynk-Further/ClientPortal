namespace Infrastructure.Persistence.Public;

public sealed class PublicTenant
{
    public Guid Id { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Domain { get; set; } = string.Empty;

    public string Plan { get; set; } = string.Empty;

    public string SettingsJson { get; set; } = "{}";

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
}
