using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure.Persistence;

public sealed class TenantDbContextFactory : ITenantDbContextFactory
{
    private readonly IServiceProvider _serviceProvider;

    public TenantDbContextFactory(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public TenantDbContext Create()
    {
        return _serviceProvider.GetRequiredService<TenantDbContext>();
    }
}
