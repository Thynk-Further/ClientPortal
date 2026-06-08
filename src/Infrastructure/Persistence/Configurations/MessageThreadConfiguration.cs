using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class MessageThreadConfiguration : IEntityTypeConfiguration<MessageThread>
{
    public void Configure(EntityTypeBuilder<MessageThread> builder)
    {
        builder.ToTable("message_threads");
        builder.HasKey(thread => thread.Id);
        builder.Property(thread => thread.ClientId).IsRequired();
        builder.Property(thread => thread.ProjectId);
        builder.Property(thread => thread.Subject).HasMaxLength(512).IsRequired();
        builder.Property(thread => thread.LastMessageAt).IsRequired();
        builder.Property(thread => thread.CreatedAt).IsRequired();
        builder.Property(thread => thread.UpdatedAt).IsRequired();
        builder.HasIndex(thread => thread.ClientId);
        builder.Ignore(thread => thread.DomainEvents);
        builder.Ignore(thread => thread.Participants);

        builder.Property<List<Guid>>("_participants")
            .HasColumnName("participant_ids_json")
            .HasColumnType("jsonb")
            .HasConversion(JsonListConverters.GuidListToJsonb)
            .IsRequired();
    }
}
