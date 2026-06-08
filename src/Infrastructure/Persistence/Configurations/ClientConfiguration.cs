using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> builder)
    {
        builder.ToTable("clients");
        builder.HasKey(client => client.Id);
        builder.Property(client => client.CompanyName).HasMaxLength(512).IsRequired();
        builder.Property(client => client.ContactName).HasMaxLength(256).IsRequired();
        builder
            .Property(client => client.Email)
            .HasConversion(email => email.Value, value => new EmailAddress(value))
            .HasMaxLength(320)
            .IsRequired();
        builder
            .Property(client => client.Phone)
            .HasConversion(phone => phone.Value, value => new PhoneNumber(value))
            .HasMaxLength(32)
            .IsRequired();
        builder.Property(client => client.Status).HasConversion<int>().IsRequired();
        builder.Property(client => client.InvitedAt).IsRequired();
        builder.Property(client => client.OnboardedAt);
        builder.Property(client => client.Notes).HasMaxLength(4000);
        builder.Property(client => client.CreatedAt).IsRequired();
        builder.Property(client => client.UpdatedAt).IsRequired();
        builder.Ignore(client => client.DomainEvents);
    }
}
