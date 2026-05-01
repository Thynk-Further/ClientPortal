using Application.Notifications.Abstractions;
using System.Net;
using System.Text.RegularExpressions;

namespace Infrastructure.Notifications;

public sealed class NotificationTemplateEngine : INotificationTemplateEngine
{
    private static readonly Regex TokenRegex = new(@"\{\{\s*(?<raw>!)?(?<key>[A-Za-z0-9_]+)\s*\}\}", RegexOptions.Compiled);

    public string RenderHtml(string template, IReadOnlyDictionary<string, string>? data = null)
    {
        string source = template ?? string.Empty;
        if (data is null || data.Count == 0)
        {
            return source;
        }

        return TokenRegex.Replace(source, match =>
        {
            bool isRaw = match.Groups["raw"].Success;
            string key = match.Groups["key"].Value;
            if (!data.TryGetValue(key, out string? value))
            {
                return string.Empty;
            }

            if (isRaw)
            {
                return value ?? string.Empty;
            }

            return WebUtility.HtmlEncode(value ?? string.Empty);
        });
    }
}
