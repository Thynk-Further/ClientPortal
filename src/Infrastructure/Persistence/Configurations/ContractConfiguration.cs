using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class ContractConfiguration : IEntityTypeConfiguration<Contract>
{
    public void Configure(EntityTypeBuilder<Contract> builder)
    {
        builder.ToTable("contracts");
        builder.HasKey(contract => contract.Id);
        builder.Property(contract => contract.ClientId).IsRequired();
        builder.Property(contract => contract.Title).HasMaxLength(512).IsRequired();
        builder.Property(contract => contract.Status).HasConversion<int>().IsRequired();
        builder.Property(contract => contract.SignedAt);
        builder.Property(contract => contract.ExpiresAt);
        builder.Property(contract => contract.S3Key).HasMaxLength(1024).IsRequired();
        builder.Property(contract => contract.CreatedAt).IsRequired();
        builder.Property(contract => contract.UpdatedAt).IsRequired();
        builder.HasIndex(contract => contract.ClientId);
        builder.HasIndex(contract => contract.Status);
        builder.Ignore(contract => contract.DomainEvents);
        builder.Ignore(contract => contract.Parties);

        builder.Property<List<string>>("_parties")
            .HasColumnName("parties_json")
            .HasColumnType("jsonb")
            .HasConversion(JsonListConverters.StringListToJsonb)
            .IsRequired();
    }
}
