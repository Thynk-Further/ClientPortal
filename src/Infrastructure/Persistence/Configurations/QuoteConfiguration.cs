using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class QuoteConfiguration : IEntityTypeConfiguration<Quote>
{
    public void Configure(EntityTypeBuilder<Quote> builder)
    {
        builder.ToTable("quotes");
        builder.HasKey(quote => quote.Id);
        builder.Property(quote => quote.ClientId);
        builder.Property(quote => quote.ProjectId);
        builder.Property(quote => quote.RecipientCompanyName).HasMaxLength(512);
        builder.Property(quote => quote.RecipientContactName).HasMaxLength(256);
        builder.Property(quote => quote.RecipientEmail).HasMaxLength(320);
        builder.Property(quote => quote.RecipientPhone).HasMaxLength(64);
        builder.Property(quote => quote.QuoteNumber).HasMaxLength(64).IsRequired();
        builder.Property(quote => quote.Status).HasConversion<int>().IsRequired();
        builder.Property(quote => quote.Subtotal).HasPrecision(18, 2).IsRequired();
        builder.Property(quote => quote.TaxAmount).HasPrecision(18, 2).IsRequired();
        builder.Property(quote => quote.Total).HasPrecision(18, 2).IsRequired();
        builder.Property(quote => quote.Currency).HasMaxLength(3).IsRequired();
        builder.Property(quote => quote.DueDate).IsRequired();
        builder.Property(quote => quote.Notes).HasMaxLength(4000);
        builder.Property(quote => quote.ConvertedInvoiceId);
        builder.Property(quote => quote.RfqId);
        builder.Property(quote => quote.PurchaseOrderId);
        builder.Property(quote => quote.Origin).HasConversion<int>().IsRequired();
        builder.Property(quote => quote.CreatedAt).IsRequired();
        builder.Property(quote => quote.UpdatedAt).IsRequired();
        builder.HasIndex(quote => quote.ClientId);
        builder.HasIndex(quote => quote.ProjectId);
        builder.Ignore(quote => quote.DomainEvents);

        builder.OwnsMany(
            quote => quote.LineItems,
            lineBuilder =>
            {
                lineBuilder.ToTable("quote_line_items");
                lineBuilder.WithOwner().HasForeignKey("quote_id");
                lineBuilder.Property<Guid>("Id")
                    .HasColumnName("id")
                    .ValueGeneratedOnAdd();
                lineBuilder.HasKey("Id");
                lineBuilder.Property(line => line.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();
                lineBuilder.Property(line => line.Quantity).HasColumnName("quantity").HasPrecision(18, 4).IsRequired();
                lineBuilder.Property(line => line.UnitPrice).HasColumnName("unit_price").HasPrecision(18, 2).IsRequired();
                lineBuilder.Property(line => line.TaxRate).HasColumnName("tax_rate").HasPrecision(18, 4).IsRequired();
                lineBuilder.Property(line => line.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
                lineBuilder.HasIndex("quote_id");
            });
    }
}
