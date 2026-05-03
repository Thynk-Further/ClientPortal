using System.Security.Cryptography;

namespace Infrastructure.Tenancy;

public sealed class TenantKeyGenerator : ITenantKeyGenerator
{
    private const int KeySizeBytes = 32;

    public string GenerateUrlSafeKey()
    {
        byte[] bytes = new byte[KeySizeBytes];
        RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    private static string Base64UrlEncode(byte[] data)
    {
        return Convert.ToBase64String(data)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }
}
