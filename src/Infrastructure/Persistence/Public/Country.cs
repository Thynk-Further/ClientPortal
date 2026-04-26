namespace Infrastructure.Persistence.Public;

public sealed class Country
{
    public Guid Id { get; set; }

    public string IsoCode { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string DefaultCurrency { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
}
