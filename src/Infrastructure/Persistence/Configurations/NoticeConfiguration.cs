using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class NoticeConfiguration : IEntityTypeConfiguration<Notice>
{
    public void Configure(EntityTypeBuilder<Notice> builder)
    {
        builder.ToTable("notices");
        builder.HasKey(notice => notice.Id);
        builder.Property(notice => notice.Title).HasMaxLength(512).IsRequired();
        builder.Property(notice => notice.Content).HasMaxLength(16000).IsRequired();
        builder.Property(notice => notice.PublishedAt).IsRequired();
        builder.Property(notice => notice.ExpiresAt);
        builder.Property(notice => notice.IsActive).IsRequired();
        builder.Property(notice => notice.CreatedAt).IsRequired();
        builder.Property(notice => notice.UpdatedAt).IsRequired();
        builder.Ignore(notice => notice.DomainEvents);
        builder.Ignore(notice => notice.TargetClientIds);

        builder.Property<List<Guid>?>("_targetClientIds")
            .HasColumnName("target_client_ids_json")
            .HasColumnType("jsonb")
            .HasConversion(JsonListConverters.NullableGuidListToJsonb);
    }
}
