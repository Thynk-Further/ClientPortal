using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class RfqConfiguration : IEntityTypeConfiguration<Rfq>
{
    public void Configure(EntityTypeBuilder<Rfq> builder)
    {
        builder.ToTable("rfqs");
        builder.HasKey(rfq => rfq.Id);
        builder.Property(rfq => rfq.ClientId).IsRequired();
        builder.Property(rfq => rfq.ProjectId).IsRequired();
        builder.Property(rfq => rfq.RfqNumber).HasMaxLength(64).IsRequired();
        builder.Property(rfq => rfq.Title).HasMaxLength(256).IsRequired();
        builder.Property(rfq => rfq.QuotationDueAtUtc).IsRequired();
        builder.Property(rfq => rfq.Status).HasConversion<int>().IsRequired();
        builder.Property(rfq => rfq.Currency).HasMaxLength(3).IsRequired();
        builder.Property(rfq => rfq.Notes).HasMaxLength(4000);
        builder.Property(rfq => rfq.QuotationId);
        builder.Property(rfq => rfq.CreatedAt).IsRequired();
        builder.Property(rfq => rfq.UpdatedAt).IsRequired();
        builder.HasIndex(rfq => rfq.ClientId);
        builder.HasIndex(rfq => rfq.ProjectId);
        builder.HasIndex(rfq => rfq.Status);
        builder.Ignore(rfq => rfq.DomainEvents);

        builder.OwnsMany(
            rfq => rfq.LineItems,
            lineBuilder =>
            {
                lineBuilder.ToTable("rfq_line_items");
                lineBuilder.WithOwner().HasForeignKey("rfq_id");
                lineBuilder.Property<Guid>("Id")
                    .HasColumnName("id")
                    .ValueGeneratedOnAdd();
                lineBuilder.HasKey("Id");
                lineBuilder.Property(line => line.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();
                lineBuilder.Property(line => line.Quantity).HasColumnName("quantity").HasPrecision(18, 4).IsRequired();
                lineBuilder.HasIndex("rfq_id");
            });
    }
}
