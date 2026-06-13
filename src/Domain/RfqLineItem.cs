using Shared;

namespace Domain;

public sealed record RfqLineItem
{
    /// <summary>Parameterless constructor for EF Core owned entity materialization.</summary>
    private RfqLineItem()
    {
        Description = string.Empty;
        Quantity = 1m;
    }

    public RfqLineItem(string description, decimal quantity)
        : this()
    {
        Description = Guard.NotEmpty(description, nameof(description)).Trim();
        Quantity = NormalizeQuantity(quantity);
    }

    public string Description { get; init; } = string.Empty;

    public decimal Quantity { get; init; }

    private static decimal NormalizeQuantity(decimal quantity)
    {
        if (quantity <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(quantity), "Quantity must be greater than zero.");
        }

        return quantity;
    }
}
