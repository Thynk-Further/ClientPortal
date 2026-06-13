using Domain;

namespace Domain.Tests;

public sealed class QuoteTests
{
    [Fact]
    public void Create_ComputesTotals_AndStartsAsDraft()
    {
        Quote quote = Quote.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Q-0001",
            [
                new LineItem("Design", 5m, 100m, 0.15m),
                new LineItem("Build", 2m, 250m, 0.15m),
            ],
            "usd",
            new DateOnly(2026, 06, 01),
            "  valid for 30 days ");

        Assert.Equal(1000m, quote.Subtotal);
        Assert.Equal(150m, quote.TaxAmount);
        Assert.Equal(1150m, quote.Total);
        Assert.Equal("USD", quote.Currency);
        Assert.Equal("valid for 30 days", quote.Notes);
        Assert.Equal(QuoteStatus.Draft, quote.Status);
        Assert.Equal(2, quote.LineItems.Count);
    }

    [Fact]
    public void CreateForExternalRecipient_ComputesTotals_AndStartsAsDraft()
    {
        Quote quote = Quote.CreateForExternalRecipient(
            Guid.NewGuid(),
            "Q-EXT-001",
            [new LineItem("Supply", 2m, 150m, 0m)],
            "USD",
            new DateOnly(2026, 06, 01),
            "Acme Labs",
            "Jane Doe",
            "jane@acme.test",
            "+123456789");

        Assert.Equal(QuoteOrigin.ExternalOffPlatform, quote.Origin);
        Assert.Null(quote.ClientId);
        Assert.Null(quote.ProjectId);
        Assert.Equal("Acme Labs", quote.RecipientCompanyName);
        Assert.Equal(300m, quote.Total);
        Assert.Equal(QuoteStatus.Draft, quote.Status);
    }

    [Fact]
    public void MarkAccepted_WhenNotSent_ThrowsInvalidOperationException()
    {
        Quote quote = Quote.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Q-0002",
            [new LineItem("Consulting", 1m, 500m, 0m)],
            "ZAR",
            new DateOnly(2026, 06, 01));

        Assert.Throws<InvalidOperationException>(() => quote.MarkAccepted());
    }

    [Fact]
    public void MarkAccepted_WhenSent_RaisesQuoteAcceptedEvent()
    {
        Quote quote = Quote.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Q-0003",
            [new LineItem("Consulting", 1m, 500m, 0m)],
            "ZAR",
            new DateOnly(2026, 06, 01));

        quote.MarkSent();
        quote.ClearDomainEvents();
        quote.MarkAccepted();

        QuoteAcceptedEvent @event = Assert.IsType<QuoteAcceptedEvent>(Assert.Single(quote.DomainEvents));
        Assert.Equal(quote.Id, @event.QuoteId);
        Assert.Equal(quote.ClientId, @event.ClientId);
        Assert.Equal(QuoteStatus.Accepted, quote.Status);
    }

    [Fact]
    public void MarkConvertedToInvoice_WhenAccepted_SetsConvertedInvoiceId()
    {
        Quote quote = Quote.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "Q-0004",
            [new LineItem("Consulting", 1m, 500m, 0m)],
            "ZAR",
            new DateOnly(2026, 06, 01));

        quote.MarkSent();
        quote.MarkAccepted();

        Guid invoiceId = Guid.NewGuid();
        quote.MarkConvertedToInvoice(invoiceId);

        Assert.Equal(invoiceId, quote.ConvertedInvoiceId);
    }
}
