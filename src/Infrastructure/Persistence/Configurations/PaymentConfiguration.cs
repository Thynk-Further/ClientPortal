using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("payments");
        builder.HasKey(payment => payment.Id);
        builder.Property(payment => payment.InvoiceId).IsRequired();
        builder.Property(payment => payment.Amount).HasPrecision(18, 2).IsRequired();
        builder.Property(payment => payment.Currency).HasMaxLength(3).IsRequired();
        builder.Property(payment => payment.Method).HasMaxLength(128).IsRequired();
        builder.Property(payment => payment.Reference).HasMaxLength(256).IsRequired();
        builder.Property(payment => payment.PaidAt).IsRequired();
        builder.Property(payment => payment.Notes).HasMaxLength(4000);
        builder.Property(payment => payment.SubmissionId);
        builder.Property(payment => payment.CreatedAt).IsRequired();
        builder.Property(payment => payment.UpdatedAt).IsRequired();
        builder.HasIndex(payment => payment.InvoiceId);
        builder.HasIndex(payment => new { payment.InvoiceId, payment.Reference }).IsUnique();
    }
}
