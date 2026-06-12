using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class PurchaseOrderConfiguration : IEntityTypeConfiguration<PurchaseOrder>
{
    public void Configure(EntityTypeBuilder<PurchaseOrder> builder)
    {
        builder.ToTable("purchase_orders");
        builder.HasKey(po => po.Id);
        builder.Property(po => po.ClientId).IsRequired();
        builder.Property(po => po.ProjectId).IsRequired();
        builder.Property(po => po.PoNumber).HasMaxLength(64).IsRequired();
        builder.Property(po => po.QuotationId).IsRequired();
        builder.Property(po => po.RfqId).IsRequired();
        builder.Property(po => po.Status).HasConversion<int>().IsRequired();
        builder.Property(po => po.Subtotal).HasPrecision(18, 2).IsRequired();
        builder.Property(po => po.TaxAmount).HasPrecision(18, 2).IsRequired();
        builder.Property(po => po.Total).HasPrecision(18, 2).IsRequired();
        builder.Property(po => po.Currency).HasMaxLength(3).IsRequired();
        builder.Property(po => po.ApprovedAt);
        builder.Property(po => po.GeneratedInvoiceId);
        builder.Property(po => po.Notes).HasMaxLength(4000);
        builder.Property(po => po.CreatedAt).IsRequired();
        builder.Property(po => po.UpdatedAt).IsRequired();
        builder.HasIndex(po => po.ClientId);
        builder.HasIndex(po => po.QuotationId);
        builder.HasIndex(po => po.RfqId);
        builder.HasIndex(po => po.Status);
        builder.Ignore(po => po.DomainEvents);

        builder.OwnsMany(
            po => po.LineItems,
            lineBuilder =>
            {
                lineBuilder.ToTable("purchase_order_line_items");
                lineBuilder.WithOwner().HasForeignKey("purchase_order_id");
                lineBuilder.Property<Guid>("Id")
                    .HasColumnName("id")
                    .ValueGeneratedOnAdd();
                lineBuilder.HasKey("Id");
                lineBuilder.Property(line => line.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();
                lineBuilder.Property(line => line.Quantity).HasColumnName("quantity").HasPrecision(18, 4).IsRequired();
                lineBuilder.Property(line => line.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 2).IsRequired();
                lineBuilder.Property(line => line.TaxRate).HasColumnName("tax_rate").HasPrecision(18, 4).IsRequired();
                lineBuilder.Property(line => line.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
                lineBuilder.HasIndex("purchase_order_id");
            });
    }
}
