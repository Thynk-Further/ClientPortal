using Domain;

namespace Domain.Tests;

public sealed class RfqTests
{
    [Fact]
    public void Submit_FromDraft_RaisesRfqSubmittedEvent()
    {
        Rfq rfq = CreateRfq();

        rfq.Submit();

        Assert.Equal(RfqStatus.Submitted, rfq.Status);
        Assert.IsType<RfqSubmittedEvent>(Assert.Single(rfq.DomainEvents));
    }

    [Fact]
    public void MarkQuoted_OnlyFromSubmitted_Succeeds()
    {
        Rfq rfq = CreateRfq();
        rfq.Submit();

        rfq.MarkQuoted(Guid.CreateVersion7());

        Assert.Equal(RfqStatus.Quoted, rfq.Status);
        Assert.NotNull(rfq.QuotationId);
    }

    [Fact]
    public void MarkQuoted_FromDraft_ThrowsInvalidOperationException()
    {
        Rfq rfq = CreateRfq();

        Assert.Throws<InvalidOperationException>(() => rfq.MarkQuoted(Guid.CreateVersion7()));
    }

    private static Rfq CreateRfq()
    {
        return Rfq.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "RFQ-001",
            [new RfqLineItem("Laptop", 2m)],
            "ZAR");
    }
}
