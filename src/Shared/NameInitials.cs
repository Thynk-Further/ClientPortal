namespace Shared;

public static class NameInitials
{
    public static string FromName(string name)
    {
        string[] parts = name
            .Trim()
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (parts.Length == 0)
        {
            return "XX";
        }

        if (parts.Length == 1)
        {
            string word = parts[0];
            return word.Length <= 2
                ? word.ToUpperInvariant()
                : word[..2].ToUpperInvariant();
        }

        char first = char.ToUpperInvariant(parts[0][0]);
        char second = char.ToUpperInvariant(parts[1][0]);
        return $"{first}{second}";
    }
}
