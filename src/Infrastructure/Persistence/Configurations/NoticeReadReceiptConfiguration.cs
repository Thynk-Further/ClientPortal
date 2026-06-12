using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class NoticeReadReceiptConfiguration : IEntityTypeConfiguration<NoticeReadReceipt>
{
    public void Configure(EntityTypeBuilder<NoticeReadReceipt> builder)
    {
        builder.ToTable("notice_read_receipts");
        builder.HasKey(receipt => receipt.Id);
        builder.Property(receipt => receipt.NoticeId).IsRequired();
        builder.Property(receipt => receipt.UserId).IsRequired();
        builder.Property(receipt => receipt.ReadAt).IsRequired();
        builder.Property(receipt => receipt.CreatedAt).IsRequired();
        builder.Property(receipt => receipt.UpdatedAt).IsRequired();

        builder.HasIndex(receipt => new { receipt.NoticeId, receipt.UserId })
            .IsUnique();
    }
}
