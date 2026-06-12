using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class InvoicePaymentSubmissionConfiguration : IEntityTypeConfiguration<InvoicePaymentSubmission>
{
    public void Configure(EntityTypeBuilder<InvoicePaymentSubmission> builder)
    {
        builder.ToTable("invoice_payment_submissions");
        builder.HasKey(submission => submission.Id);
        builder.Property(submission => submission.InvoiceId).IsRequired();
        builder.Property(submission => submission.ClientId).IsRequired();
        builder.Property(submission => submission.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(submission => submission.Currency).HasMaxLength(3).IsRequired();
        builder.Property(submission => submission.Method).HasMaxLength(128).IsRequired();
        builder.Property(submission => submission.Reference).HasMaxLength(256).IsRequired();
        builder.Property(submission => submission.ProofDocumentId).IsRequired();
        builder.Property(submission => submission.Status).HasConversion<int>().IsRequired();
        builder.Property(submission => submission.SubmittedByUserId).IsRequired();
        builder.Property(submission => submission.ReviewedByUserId);
        builder.Property(submission => submission.ReviewNotes).HasMaxLength(4000);
        builder.Property(submission => submission.ReviewedAt);
        builder.Property(submission => submission.GatewayProvider).HasMaxLength(64);
        builder.Property(submission => submission.GatewayReference).HasMaxLength(256);
        builder.Property(submission => submission.CreatedAt).IsRequired();
        builder.Property(submission => submission.UpdatedAt).IsRequired();
        builder.HasIndex(submission => submission.InvoiceId);
        builder.HasIndex(submission => submission.ClientId);
        builder.HasIndex(submission => submission.Status);
        builder.Ignore(submission => submission.DomainEvents);
    }
}
