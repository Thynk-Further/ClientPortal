using Shared;

namespace Domain.Tests;

public sealed class NameInitialsTests
{
    [Theory]
    [InlineData("Acme Consulting", "AC")]
    [InlineData("Bymed Medical and Scientific", "BM")]
    [InlineData("Solo", "SO")]
    [InlineData("A", "A")]
    [InlineData("  spaced   name  ", "SN")]
    public void FromName_ExtractsExpectedInitials(string name, string expected)
    {
        Assert.Equal(expected, NameInitials.FromName(name));
    }
}
