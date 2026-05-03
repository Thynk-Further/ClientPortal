namespace Infrastructure.Tenancy;

public interface ITenantKeyGenerator
{
    string GenerateUrlSafeKey();
}
