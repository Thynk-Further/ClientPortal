namespace Application.Notifications.Abstractions;

public interface INotificationTemplateEngine
{
    string RenderHtml(string template, IReadOnlyDictionary<string, string>? data = null);
}
