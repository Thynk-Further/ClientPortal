using System.Reflection;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

internal static class TenantEntityConfigurationExtensions
{
    private const string TenantConfigurationsNamespace = "Infrastructure.Persistence.Configurations";

    /// <summary>
    /// Applies every <see cref="IEntityTypeConfiguration{TEntity}"/> in
    /// <c>Infrastructure.Persistence.Configurations</c> so new tenant tables are included automatically when you add a migration.
    /// </summary>
    public static ModelBuilder ApplyTenantEntityConfigurations(this ModelBuilder modelBuilder)
    {
        Assembly assembly = typeof(TenantDbContext).Assembly;
        modelBuilder.ApplyConfigurationsFromAssembly(assembly, IsTenantSchemaConfigurationType);
        return modelBuilder;
    }

    private static bool IsTenantSchemaConfigurationType(Type type)
    {
        if (!type.IsClass || type.IsAbstract)
        {
            return false;
        }

        if (!string.Equals(type.Namespace, TenantConfigurationsNamespace, StringComparison.Ordinal))
        {
            return false;
        }

        return type.GetInterfaces().Any(static i =>
            i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IEntityTypeConfiguration<>));
    }
}
