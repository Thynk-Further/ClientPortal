using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("invoices");
        builder.HasKey(invoice => invoice.Id);
        builder.Property(invoice => invoice.ClientId).IsRequired();
        builder.Property(invoice => invoice.ProjectId).IsRequired();
        builder.Property(invoice => invoice.InvoiceNumber).HasMaxLength(64).IsRequired();
        builder.Property(invoice => invoice.Status).HasConversion<int>().IsRequired();
        builder.Property(invoice => invoice.Subtotal).HasPrecision(18, 2).IsRequired();
        builder.Property(invoice => invoice.TaxAmount).HasPrecision(18, 2).IsRequired();
        builder.Property(invoice => invoice.Total).HasPrecision(18, 2).IsRequired();
        builder.Property(invoice => invoice.AmountPaid).HasPrecision(18, 2).IsRequired();
        builder.Property(invoice => invoice.Currency).HasMaxLength(3).IsRequired();
        builder.Property(invoice => invoice.DueDate).IsRequired();
        builder.Property(invoice => invoice.PaidAt);
        builder.Property(invoice => invoice.Notes).HasMaxLength(4000);
        builder.Property(invoice => invoice.PurchaseOrderId);
        builder.Property(invoice => invoice.QuotationId);
        builder.Property(invoice => invoice.CreatedAt).IsRequired();
        builder.Property(invoice => invoice.UpdatedAt).IsRequired();
        builder.HasIndex(invoice => invoice.ClientId);
        builder.HasIndex(invoice => invoice.ProjectId);
        builder.HasIndex(invoice => invoice.Status);
        builder.Ignore(invoice => invoice.DomainEvents);

        builder.OwnsMany(
            invoice => invoice.LineItems,
            lineBuilder =>
            {
                lineBuilder.ToTable("line_item");
                lineBuilder.WithOwner().HasForeignKey("invoice_id");
                lineBuilder.Property<Guid>("Id")
                    .HasColumnName("id")
                    .ValueGeneratedOnAdd();
                lineBuilder.HasKey("Id");
                lineBuilder.Property(line => line.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();
                lineBuilder.Property(line => line.Quantity).HasColumnName("quantity").HasPrecision(18, 4).IsRequired();
                lineBuilder.Property(line => line.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 2).IsRequired();
                lineBuilder.Property(line => line.TaxRate).HasColumnName("tax_rate").HasPrecision(18, 4).IsRequired();
                lineBuilder.Property(line => line.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
                lineBuilder.HasIndex("invoice_id");
            });
    }
}
