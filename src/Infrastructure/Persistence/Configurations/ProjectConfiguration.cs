using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class ProjectConfiguration : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.ToTable("projects");
        builder.HasKey(project => project.Id);
        builder.Property(project => project.ClientId).IsRequired();
        builder.Property(project => project.Name).HasMaxLength(512).IsRequired();
        builder.Property(project => project.Description).HasMaxLength(8000).IsRequired();
        builder.Property(project => project.Status).HasConversion<int>().IsRequired();
        builder.Property(project => project.StartDate).IsRequired();
        builder.Property(project => project.EndDate).IsRequired();
        builder.Property(project => project.Budget).HasPrecision(18, 2).IsRequired();
        builder.Property(project => project.Currency).HasMaxLength(3).IsRequired();
        builder.Property(project => project.CreatedAt).IsRequired();
        builder.Property(project => project.UpdatedAt).IsRequired();
        builder.HasIndex(project => project.ClientId);
        builder.Ignore(project => project.DomainEvents);
    }
}
