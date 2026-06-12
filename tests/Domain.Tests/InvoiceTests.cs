using Domain;

namespace Domain.Tests;

public sealed class InvoiceTests
{
    [Fact]
    public void Create_ComputesTotals_AndNormalizesCurrency()
    {
        Invoice invoice = Invoice.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "INV-0001",
            [
                new LineItem("Discovery workshop", 2m, 1000m, 0.15m),
                new LineItem("Implementation", 1m, 500m, 0m),
            ],
            "zar",
            new DateOnly(2026, 05, 15),
            "  Net 15  ");

        Assert.Equal(2500m, invoice.Subtotal);
        Assert.Equal(300m, invoice.TaxAmount);
        Assert.Equal(2800m, invoice.Total);
        Assert.Equal("ZAR", invoice.Currency);
        Assert.Equal("Net 15", invoice.Notes);
        Assert.Equal(InvoiceStatus.Draft, invoice.Status);
        Assert.Null(invoice.PaidAt);
        Assert.Equal(2, invoice.LineItems.Count);
    }

    [Fact]
    public void ReplaceLineItems_WhenNotDraft_ThrowsInvalidOperationException()
    {
        Invoice invoice = Invoice.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "INV-0002",
            [new LineItem("Retainer", 1m, 1000m, 0.15m)],
            "USD",
            new DateOnly(2026, 05, 10));

        invoice.MarkSent();

        Assert.Throws<InvalidOperationException>(
            () => invoice.ReplaceLineItems([new LineItem("Support", 1m, 500m, 0.15m)]));
    }

    [Fact]
    public void MarkSent_RaisesInvoiceSentEvent()
    {
        Invoice invoice = Invoice.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "INV-0002A",
            [new LineItem("Retainer", 1m, 1000m, 0.15m)],
            "USD",
            new DateOnly(2026, 05, 10));

        invoice.MarkSent();

        InvoiceSentEvent @event = Assert.IsType<InvoiceSentEvent>(Assert.Single(invoice.DomainEvents));
        Assert.Equal(invoice.Id, @event.InvoiceId);
        Assert.Equal(invoice.ClientId, @event.ClientId);
    }

    [Fact]
    public void MarkViewed_AfterSent_RaisesInvoiceViewedEvent()
    {
        Invoice invoice = Invoice.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "INV-0002B",
            [new LineItem("Support", 1m, 300m, 0.15m)],
            "USD",
            new DateOnly(2026, 05, 12));

        invoice.MarkSent();
        invoice.ClearDomainEvents();
        invoice.MarkViewed();

        InvoiceViewedEvent @event = Assert.IsType<InvoiceViewedEvent>(Assert.Single(invoice.DomainEvents));
        Assert.Equal(invoice.Id, @event.InvoiceId);
        Assert.Equal(invoice.ClientId, @event.ClientId);
        Assert.Equal(InvoiceStatus.Viewed, invoice.Status);
    }

    [Fact]
    public void MarkPaid_SetsPaidStatusAndTimestamp()
    {
        Invoice invoice = Invoice.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "INV-0003",
            [new LineItem("Maintenance", 1m, 200m, 0.15m)],
            "ZMW",
            new DateOnly(2026, 05, 20));

        DateTime paidAt = DateTime.UtcNow.AddMinutes(-1);
        invoice.MarkPaid(paidAt);

        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
        Assert.Equal(paidAt, invoice.PaidAt);
        Assert.Equal(invoice.Total, invoice.AmountPaid);
        InvoicePaidEvent @event = Assert.IsType<InvoicePaidEvent>(Assert.Single(invoice.DomainEvents));
        Assert.Equal(invoice.Id, @event.InvoiceId);
        Assert.Equal(invoice.ClientId, @event.ClientId);
        Assert.Equal(paidAt, @event.PaidAt);
    }

    [Fact]
    public void RecordPayment_WithPartialAmount_SetsPartiallyPaidStatus()
    {
        Invoice invoice = Invoice.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "INV-0004",
            [new LineItem("Maintenance", 1m, 1000m, 0.15m)],
            "ZMW",
            new DateOnly(2026, 05, 20));

        DateTime paidAt = DateTime.UtcNow.AddMinutes(-1);
        invoice.RecordPayment(500m, paidAt);

        Assert.Equal(InvoiceStatus.PartiallyPaid, invoice.Status);
        Assert.Equal(500m, invoice.AmountPaid);
        Assert.Null(invoice.PaidAt);
        Assert.Empty(invoice.DomainEvents);
    }

    [Fact]
    public void RecordPayment_WithOutstandingBalanceCompletion_SetsPaidAndRaisesEvent()
    {
        Invoice invoice = Invoice.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "INV-0005",
            [new LineItem("Maintenance", 1m, 1000m, 0.15m)],
            "ZMW",
            new DateOnly(2026, 05, 20));

        invoice.RecordPayment(500m, DateTime.UtcNow.AddMinutes(-2));
        invoice.ClearDomainEvents();

        DateTime paidAt = DateTime.UtcNow.AddMinutes(-1);
        invoice.RecordPayment(650m, paidAt);

        Assert.Equal(InvoiceStatus.Paid, invoice.Status);
        Assert.Equal(1150m, invoice.AmountPaid);
        Assert.Equal(paidAt, invoice.PaidAt);
        InvoicePaidEvent @event = Assert.IsType<InvoicePaidEvent>(Assert.Single(invoice.DomainEvents));
        Assert.Equal(invoice.Id, @event.InvoiceId);
        Assert.Equal(invoice.ClientId, @event.ClientId);
        Assert.Equal(paidAt, @event.PaidAt);
    }

    [Fact]
    public void MarkOverdue_WhenDueDatePassed_UpdatesStatus()
    {
        Invoice invoice = Invoice.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "INV-OVERDUE",
            [new LineItem("Support", 1m, 100m, 0m)],
            "USD",
            new DateOnly(2026, 01, 01));

        invoice.MarkSent();
        invoice.MarkOverdue(new DateOnly(2026, 06, 01));

        Assert.Equal(InvoiceStatus.Overdue, invoice.Status);
    }
}
