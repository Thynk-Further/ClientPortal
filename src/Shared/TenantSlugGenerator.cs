using System.Text;

namespace Shared;

/// <summary>
/// Builds URL-safe tenant slugs used by business registration (ASCII lowercase letters, digits, hyphens).
/// </summary>
public static class TenantSlugGenerator
{
    public const int MaxLength = 128;

    /// <summary>
    /// Derives a slug from the company name. Non-alphanumeric ASCII characters become hyphens; runs collapse.
    /// </summary>
    public static string FromCompanyName(string companyName)
    {
        ArgumentNullException.ThrowIfNull(companyName);

        ReadOnlySpan<char> trimmed = companyName.AsSpan().Trim();
        if (trimmed.IsEmpty)
        {
            return FallbackSlug();
        }

        StringBuilder sb = new(trimmed.Length);
        bool lastWasHyphen = false;

        foreach (char c in trimmed)
        {
            char lower = char.ToLowerInvariant(c);
            bool isAlnum = lower is (>= 'a' and <= 'z') or (>= '0' and <= '9');
            if (isAlnum)
            {
                sb.Append(lower);
                lastWasHyphen = false;
            }
            else if (sb.Length > 0 && !lastWasHyphen)
            {
                sb.Append('-');
                lastWasHyphen = true;
            }
        }

        TrimHyphenEdges(sb);

        string result = sb.ToString();
        if (string.IsNullOrEmpty(result))
        {
            return FallbackSlug();
        }

        return Clamp(result, MaxLength);
    }

    /// <summary>
    /// Appends a numeric suffix for collision resolution (<c>-2</c>, <c>-3</c>, …). Total length never exceeds <see cref="MaxLength"/>.
    /// </summary>
    public static string WithNumericSuffix(string baseSlug, int suffixNumber)
    {
        ArgumentNullException.ThrowIfNull(baseSlug);
        ArgumentOutOfRangeException.ThrowIfLessThan(suffixNumber, 2);

        string suffix = $"-{suffixNumber}";
        int maxBaseLen = MaxLength - suffix.Length;
        if (maxBaseLen < 1)
        {
            return Clamp(suffix, MaxLength);
        }

        string trimmedBase = Clamp(baseSlug, maxBaseLen).TrimEnd('-');
        if (string.IsNullOrEmpty(trimmedBase))
        {
            trimmedBase = Clamp(FallbackSlug(), maxBaseLen).TrimEnd('-');
        }

        return $"{trimmedBase}{suffix}";
    }

    public static string FallbackSlug()
    {
        string tail = Guid.CreateVersion7().ToString("N")[..8];
        return Clamp($"org-{tail}", MaxLength);
    }

    public static string Clamp(string slug, int maxLength)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(maxLength, 1);

        if (slug.Length <= maxLength)
        {
            return slug;
        }

        string truncated = slug[..maxLength];
        return truncated.TrimEnd('-');
    }

    private static void TrimHyphenEdges(StringBuilder sb)
    {
        while (sb.Length > 0 && sb[0] == '-')
        {
            sb.Remove(0, 1);
        }

        while (sb.Length > 0 && sb[^1] == '-')
        {
            sb.Length--;
        }
    }
}
