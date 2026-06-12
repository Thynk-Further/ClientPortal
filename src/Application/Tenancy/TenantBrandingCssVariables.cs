namespace Application.Tenancy;

internal static class TenantBrandingCssVariables
{
    public static IReadOnlyDictionary<string, string> Create(string brandColour)
    {
        string normalizedColour = string.IsNullOrWhiteSpace(brandColour)
            ? "#2563EB"
            : brandColour.Trim();

        string foreground = IsLightColour(normalizedColour) ? "#111827" : "#FFFFFF";

        return new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["--brand-colour"] = normalizedColour,
            ["--primary"] = normalizedColour,
            ["--ring"] = normalizedColour,
            ["--sidebar-primary"] = normalizedColour,
            ["--primary-foreground"] = foreground,
            ["--sidebar-primary-foreground"] = foreground,
        };
    }

    private static bool IsLightColour(string colour)
    {
        if (!colour.StartsWith('#') || (colour.Length != 7 && colour.Length != 4))
        {
            return false;
        }

        int red = ParseHexComponent(colour, 1);
        int green = ParseHexComponent(colour, colour.Length == 4 ? 2 : 3);
        int blue = ParseHexComponent(colour, colour.Length == 4 ? 3 : 5);
        double luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255.0;
        return luminance > 0.6;
    }

    private static int ParseHexComponent(string colour, int index)
    {
        if (colour.Length == 4)
        {
            string doubled = $"{colour[index]}{colour[index]}";
            return Convert.ToInt32(doubled, 16);
        }

        return Convert.ToInt32(colour.Substring(index, 2), 16);
    }
}
