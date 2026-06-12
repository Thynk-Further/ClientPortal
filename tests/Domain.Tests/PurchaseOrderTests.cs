using Domain;

namespace Domain.Tests;

public sealed class PurchaseOrderTests
{
    [Fact]
    public void Approve_FromPending_RaisesPurchaseOrderApprovedEvent()
    {
        PurchaseOrder purchaseOrder = CreatePurchaseOrder();

        purchaseOrder.Approve(DateTime.UtcNow.AddMinutes(-1));

        Assert.Equal(PurchaseOrderStatus.Approved, purchaseOrder.Status);
        Assert.IsType<PurchaseOrderApprovedEvent>(Assert.Single(purchaseOrder.DomainEvents));
    }

    [Fact]
    public void MarkInvoiced_FromApproved_SetsGeneratedInvoiceId()
    {
        PurchaseOrder purchaseOrder = CreatePurchaseOrder();
        purchaseOrder.Approve(DateTime.UtcNow.AddMinutes(-1));
        Guid invoiceId = Guid.NewGuid();

        purchaseOrder.MarkInvoiced(invoiceId);

        Assert.Equal(PurchaseOrderStatus.Invoiced, purchaseOrder.Status);
        Assert.Equal(invoiceId, purchaseOrder.GeneratedInvoiceId);
    }

    [Fact]
    public void Reject_FromPending_SetsRejectedStatus()
    {
        PurchaseOrder purchaseOrder = CreatePurchaseOrder();

        purchaseOrder.Reject();

        Assert.Equal(PurchaseOrderStatus.Rejected, purchaseOrder.Status);
    }

    private static PurchaseOrder CreatePurchaseOrder()
    {
        return PurchaseOrder.CreateFromQuotation(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "PO-001",
            Guid.NewGuid(),
            Guid.NewGuid(),
            [new LineItem("Service", 1m, 1000m, 0.15m)],
            "ZAR");
    }
}
