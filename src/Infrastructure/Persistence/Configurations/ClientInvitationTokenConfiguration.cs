using Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class ClientInvitationTokenConfiguration : IEntityTypeConfiguration<StoredClientInvitationToken>
{
    public void Configure(EntityTypeBuilder<StoredClientInvitationToken> builder)
    {
        builder.ToTable("client_invitation_tokens");
        builder.HasKey(token => token.Id);
        builder.Property(token => token.ClientId).IsRequired();
        builder.Property(token => token.UserId).IsRequired();
        builder.Property(token => token.TokenHash).HasMaxLength(128).IsRequired();
        builder.Property(token => token.ExpiresAtUtc).IsRequired();
        builder.Property(token => token.UsedAtUtc);
        builder.Property(token => token.CreatedAtUtc).IsRequired();
        builder.HasIndex(token => token.TokenHash).IsUnique();
        builder.HasIndex(token => new { token.ClientId, token.UserId });
    }
}
