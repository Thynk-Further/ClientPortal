using Shared;

namespace Domain.Tests;

public sealed class RfqNumberComposerTests
{
    [Theory]
    [InlineData("Acme Consulting", "Bymed Medical and Scientific", "2026-06-12", "AC-BM-20260612")]
    [InlineData("Acme", "Bymed", "2026-06-12", "AC-BY-20260612")]
    [InlineData("Solo", "Client Co", "2026-01-01", "SO-CC-20260101")]
    public void ComposeBase_CombinesInitialsAndDate(
        string businessName,
        string clientName,
        string dateText,
        string expected)
    {
        DateOnly date = DateOnly.Parse(dateText);

        string result = RfqNumberComposer.ComposeBase(businessName, clientName, date);

        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(0, "AC-BM-20260612")]
    [InlineData(1, "AC-BM-20260612-02")]
    [InlineData(2, "AC-BM-20260612-03")]
    public void ComposeWithSequence_AppendsSuffixWhenNeeded(int existingCount, string expected)
    {
        string result = RfqNumberComposer.ComposeWithSequence("AC-BM-20260612", existingCount);

        Assert.Equal(expected, result);
    }
}
