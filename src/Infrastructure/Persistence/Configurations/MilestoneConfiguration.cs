using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class MilestoneConfiguration : IEntityTypeConfiguration<Milestone>
{
    public void Configure(EntityTypeBuilder<Milestone> builder)
    {
        builder.ToTable("milestones");
        builder.HasKey(milestone => milestone.Id);
        builder.Property(milestone => milestone.ProjectId).IsRequired();
        builder.Property(milestone => milestone.Name).HasMaxLength(512).IsRequired();
        builder.Property(milestone => milestone.DueDate).IsRequired();
        builder.Property(milestone => milestone.CompletedAt).IsRequired(false);
        builder.Property(milestone => milestone.Status).HasConversion<int>().IsRequired();
        builder.Property(milestone => milestone.CreatedAt).IsRequired();
        builder.Property(milestone => milestone.UpdatedAt).IsRequired();
        builder.HasIndex(milestone => milestone.ProjectId);
        builder.Ignore(milestone => milestone.DomainEvents);
    }
}
