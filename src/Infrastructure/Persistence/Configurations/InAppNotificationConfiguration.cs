using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class InAppNotificationConfiguration : IEntityTypeConfiguration<InAppNotification>
{
    public void Configure(EntityTypeBuilder<InAppNotification> builder)
    {
        builder.ToTable("in_app_notifications");
        builder.HasKey(notification => notification.Id);
        builder.Property(notification => notification.UserId).IsRequired();
        builder.Property(notification => notification.Title).HasMaxLength(512).IsRequired();
        builder.Property(notification => notification.Body).HasMaxLength(8000).IsRequired();
        builder.Property(notification => notification.MetadataJson).HasColumnType("jsonb").IsRequired();
        builder.Property(notification => notification.IsRead).IsRequired();
        builder.Property(notification => notification.ReadAt);
        builder.Property(notification => notification.CreatedAt).IsRequired();
        builder.Property(notification => notification.UpdatedAt).IsRequired();
        builder.HasIndex(notification => notification.UserId);
        builder.HasIndex(notification => new { notification.UserId, notification.IsRead });
    }
}
