using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("messages");
        builder.HasKey(message => message.Id);
        builder.Property(message => message.ThreadId).IsRequired();
        builder.Property(message => message.SenderId).IsRequired();
        builder.Property(message => message.SenderRole).HasMaxLength(64).IsRequired();
        builder.Property(message => message.ClientMessageId).HasMaxLength(128).IsRequired();
        builder.Property(message => message.SequenceNumber).IsRequired();
        builder.Property(message => message.Content).HasMaxLength(16000).IsRequired();
        builder.Property(message => message.ReplyToMessageId);
        builder.Property(message => message.EmojiReaction).HasMaxLength(32);
        builder.Property(message => message.AttachmentFileName).HasMaxLength(256);
        builder.Property(message => message.AttachmentContentType).HasMaxLength(128);
        builder.Property(message => message.AttachmentSizeBytes);
        builder.Property(message => message.AttachmentUrl).HasMaxLength(2048);
        builder.Property(message => message.AttachmentExpiresAt);
        builder.Property(message => message.IsSoftDeleted).IsRequired();
        builder.Property(message => message.DeletedAt);
        builder.Property(message => message.DeletedBy);
        builder.Property(message => message.DeletionReason).HasMaxLength(2000);
        builder.Property(message => message.ModeratedAt);
        builder.Property(message => message.ModeratedBy);
        builder.Property(message => message.ModerationReason).HasMaxLength(2000);
        builder.Property(message => message.Status).HasConversion<int>().IsRequired();
        builder.Property(message => message.SentAt).IsRequired();
        builder.Property(message => message.DeliveredAt);
        builder.Property(message => message.ReadAt);
        builder.Property(message => message.CreatedAt).IsRequired();
        builder.Property(message => message.UpdatedAt).IsRequired();
        builder.HasIndex(message => message.ThreadId);
        builder.HasIndex(message => new { message.ThreadId, message.SequenceNumber }).IsUnique();

        builder.HasOne<MessageThread>()
            .WithMany()
            .HasForeignKey(message => message.ThreadId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
