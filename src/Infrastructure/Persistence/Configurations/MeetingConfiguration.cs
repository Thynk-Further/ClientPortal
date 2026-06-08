using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class MeetingConfiguration : IEntityTypeConfiguration<Meeting>
{
    public void Configure(EntityTypeBuilder<Meeting> builder)
    {
        builder.ToTable("meetings");
        builder.HasKey(meeting => meeting.Id);
        builder.Property(meeting => meeting.ClientId).IsRequired();
        builder.Property(meeting => meeting.Title).HasMaxLength(512).IsRequired();
        builder.Property(meeting => meeting.Description).HasMaxLength(8000).IsRequired();
        builder.Property(meeting => meeting.ScheduledAt).IsRequired();
        builder.Property(meeting => meeting.DurationMinutes).IsRequired();
        builder.Property(meeting => meeting.MeetingUrl).HasMaxLength(2048).IsRequired();
        builder.Property(meeting => meeting.Status).HasConversion<int>().IsRequired();
        builder.Property(meeting => meeting.CreatedAt).IsRequired();
        builder.Property(meeting => meeting.UpdatedAt).IsRequired();
        builder.HasIndex(meeting => meeting.ClientId);
        builder.HasIndex(meeting => new { meeting.Status, meeting.ScheduledAt });
        builder.Ignore(meeting => meeting.DomainEvents);
        builder.Ignore(meeting => meeting.Attendees);

        builder.Property<List<Guid>>("_attendees")
            .HasColumnName("attendee_ids_json")
            .HasColumnType("jsonb")
            .HasConversion(JsonListConverters.GuidListToJsonb)
            .IsRequired();
    }
}
