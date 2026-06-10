using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class ProjectTaskConfiguration : IEntityTypeConfiguration<ProjectTask>
{
    public void Configure(EntityTypeBuilder<ProjectTask> builder)
    {
        builder.ToTable("project_tasks");
        builder.HasKey(task => task.Id);
        builder.Property(task => task.ProjectId).IsRequired();
        builder.Property(task => task.MilestoneId).IsRequired();
        builder.Property(task => task.Title).HasMaxLength(512).IsRequired();
        builder.Property(task => task.AssigneeId).IsRequired();
        builder.Property(task => task.Status).HasConversion<int>().IsRequired();
        builder.Property(task => task.Priority).HasConversion<int>().IsRequired();
        builder.Property(task => task.DueDate).IsRequired();
        builder.Property(task => task.CreatedAt).IsRequired();
        builder.Property(task => task.UpdatedAt).IsRequired();
        builder.HasIndex(task => task.ProjectId);
        builder.HasIndex(task => task.MilestoneId);
        builder.HasIndex(task => task.AssigneeId);
        builder.Ignore(task => task.DomainEvents);
    }
}
