using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class ProjectRiskConfiguration : IEntityTypeConfiguration<ProjectRisk>
{
    public void Configure(EntityTypeBuilder<ProjectRisk> builder)
    {
        builder.ToTable("project_risks");
        builder.HasKey(risk => risk.Id);
        builder.Property(risk => risk.ProjectId).IsRequired();
        builder.Property(risk => risk.Title).HasMaxLength(512).IsRequired();
        builder.Property(risk => risk.Description).HasMaxLength(8000).IsRequired();
        builder.Property(risk => risk.Severity).HasConversion<int>().IsRequired();
        builder.Property(risk => risk.Status).HasConversion<int>().IsRequired();
        builder.Property(risk => risk.OwnerId).IsRequired();
        builder.Property(risk => risk.DueDate).IsRequired(false);
        builder.Property(risk => risk.CreatedAt).IsRequired();
        builder.Property(risk => risk.UpdatedAt).IsRequired();
        builder.HasIndex(risk => risk.ProjectId);
        builder.Ignore(risk => risk.DomainEvents);
    }
}
