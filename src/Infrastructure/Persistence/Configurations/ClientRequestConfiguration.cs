using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations;

internal sealed class ClientRequestConfiguration : IEntityTypeConfiguration<ClientRequest>
{
    public void Configure(EntityTypeBuilder<ClientRequest> builder)
    {
        builder.ToTable("client_requests");
        builder.HasKey(request => request.Id);
        builder.Property(request => request.ClientId).IsRequired();
        builder.Property(request => request.ProjectId).IsRequired();
        builder.Property(request => request.Title).HasMaxLength(512).IsRequired();
        builder.Property(request => request.Description).HasMaxLength(8000).IsRequired();
        builder.Property(request => request.Status).HasConversion<int>().IsRequired();
        builder.Property(request => request.Priority).HasConversion<int>().IsRequired();
        builder.Property(request => request.CreatedAt).IsRequired();
        builder.Property(request => request.UpdatedAt).IsRequired();
        builder.HasIndex(request => request.ClientId);
        builder.HasIndex(request => new { request.ClientId, request.Status });
        builder.HasIndex(request => request.ProjectId);
        builder.Ignore(request => request.DomainEvents);
    }
}
