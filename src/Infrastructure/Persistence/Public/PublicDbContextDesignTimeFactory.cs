using Microsoft.EntityFrameworkCore.Design;

namespace Infrastructure.Persistence.Public;

public sealed class PublicDbContextDesignTimeFactory : IDesignTimeDbContextFactory<PublicDbContext>
{
    public PublicDbContext CreateDbContext(string[] args)
    {
        const string fallbackConnectionString = "Host=localhost;Port=5433;Database=clientportal;Username=postgres;Password=postgres";
        return new PublicDbContext(fallbackConnectionString);
    }
}
