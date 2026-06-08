using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace Infrastructure.Tenancy;

public sealed class TenantKeyHasher : ITenantKeyHasher
{
    private readonly TenantKeyOptions _options;

    public TenantKeyHasher(IOptions<TenantKeyOptions> options)
    {
        _options = options.Value;
    }

    public string ComputeHash(string plaintextTenantKey)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(plaintextTenantKey);

        if (string.IsNullOrWhiteSpace(_options.Pepper))
        {
            throw new InvalidOperationException("Tenancy:TenantKey:Pepper must be configured when hashing tenant keys.");
        }

        byte[] keyMaterial = Encoding.UTF8.GetBytes(_options.Pepper);
        byte[] message = Encoding.UTF8.GetBytes(plaintextTenantKey);
        using HMACSHA256 hmac = new(keyMaterial);
        byte[] hash = hmac.ComputeHash(message);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
