namespace Infrastructure.Persistence.Public;

public sealed class PublicPlan
{
    public Guid Id { get; set; }

    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string FeatureFlagsJson { get; set; } = "{}";

    public bool IsActive { get; set; } = true;
}
