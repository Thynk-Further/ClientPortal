using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class OnboardingChecklistConfiguration : IEntityTypeConfiguration<OnboardingChecklist>
{
    public void Configure(EntityTypeBuilder<OnboardingChecklist> builder)
    {
        builder.ToTable("onboarding_checklists");
        builder.HasKey(checklist => checklist.Id);
        builder.Property(checklist => checklist.ClientId).IsRequired();
        builder.Property(checklist => checklist.TenantId).IsRequired();
        builder.Property(checklist => checklist.CreatedAt).IsRequired();
        builder.Property(checklist => checklist.UpdatedAt).IsRequired();
        builder.HasIndex(checklist => checklist.ClientId).IsUnique();
        builder.Ignore(checklist => checklist.DomainEvents);
        builder.Ignore(checklist => checklist.ConfiguredStepKeys);
        builder.Ignore(checklist => checklist.CompletedStepKeys);

        builder.Property<List<string>>("_configuredStepKeys")
            .HasColumnName("configured_step_keys_json")
            .HasColumnType("jsonb")
            .HasConversion(JsonListConverters.StringListToJsonb)
            .IsRequired();

        builder.Property<List<string>>("_completedStepKeys")
            .HasColumnName("completed_step_keys_json")
            .HasColumnType("jsonb")
            .HasConversion(JsonListConverters.StringListToJsonb)
            .IsRequired();
    }
}
