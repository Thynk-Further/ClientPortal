using Domain;

namespace Domain.Tests;

public sealed class InvoicePaymentSubmissionTests
{
    [Fact]
    public void Create_RaisesInvoicePaymentSubmissionCreatedEvent()
    {
        InvoicePaymentSubmission submission = InvoicePaymentSubmission.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            500m,
            "ZAR",
            "EFT",
            "REF-001",
            Guid.NewGuid(),
            Guid.NewGuid());

        Assert.Equal(InvoicePaymentSubmissionStatus.Submitted, submission.Status);
        Assert.IsType<InvoicePaymentSubmissionCreatedEvent>(Assert.Single(submission.DomainEvents));
    }

    [Fact]
    public void Approve_FromSubmitted_RaisesApprovedEvent()
    {
        InvoicePaymentSubmission submission = InvoicePaymentSubmission.Create(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            500m,
            "ZAR",
            "EFT",
            "REF-001",
            Guid.NewGuid(),
            Guid.NewGuid());

        submission.ClearDomainEvents();
        submission.Approve(Guid.NewGuid(), DateTime.UtcNow.AddMinutes(-1));

        Assert.Equal(InvoicePaymentSubmissionStatus.Approved, submission.Status);
        Assert.IsType<InvoicePaymentSubmissionApprovedEvent>(Assert.Single(submission.DomainEvents));
    }
}
