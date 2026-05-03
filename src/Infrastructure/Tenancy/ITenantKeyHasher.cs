namespace Infrastructure.Tenancy;

public interface ITenantKeyHasher
{
    string ComputeHash(string plaintextTenantKey);
}
