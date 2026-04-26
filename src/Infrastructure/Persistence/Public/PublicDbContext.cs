using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Shared;

namespace Infrastructure.Persistence.Public;

public sealed class PublicDbContext : DbContext
{
    private readonly string _postgresConnectionString;

    public PublicDbContext(string postgresConnectionString)
    {
        _postgresConnectionString = Guard.NotEmpty(postgresConnectionString, nameof(postgresConnectionString));
    }

    public PublicDbContext(IConfiguration configuration)
    {
        _postgresConnectionString = Guard.NotEmpty(
            configuration.GetConnectionString("Postgres"),
            "ConnectionStrings:Postgres");
    }

    public DbSet<PublicTenant> Tenants => Set<PublicTenant>();

    public DbSet<PublicPlan> Plans => Set<PublicPlan>();

    public DbSet<Country> Countries => Set<Country>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        NpgsqlConnectionStringBuilder connectionStringBuilder = new(_postgresConnectionString)
        {
            SearchPath = "public"
        };

        optionsBuilder.UseNpgsql(connectionStringBuilder.ConnectionString);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");

        modelBuilder.Entity<PublicTenant>(entity =>
        {
            entity.ToTable("tenants", "public");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Slug).HasMaxLength(128).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(256).IsRequired();
            entity.Property(x => x.Domain).HasMaxLength(256).IsRequired();
            entity.Property(x => x.Plan).HasMaxLength(64).IsRequired();
            entity.Property(x => x.SettingsJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => x.Domain).IsUnique();
        });

        modelBuilder.Entity<PublicPlan>(entity =>
        {
            entity.ToTable("plans", "public");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Code).HasMaxLength(64).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(128).IsRequired();
            entity.Property(x => x.FeatureFlagsJson).HasColumnType("jsonb").IsRequired();
            entity.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<Country>(entity =>
        {
            entity.ToTable("countries", "public");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.IsoCode).HasMaxLength(2).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(128).IsRequired();
            entity.Property(x => x.DefaultCurrency).HasMaxLength(3).IsRequired();
            entity.HasIndex(x => x.IsoCode).IsUnique();
        });
    }
}
