using Application.Messaging.Abstractions;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Messaging;

public sealed class NoopMessageOfflineFallbackNotifier : IMessageOfflineFallbackNotifier
{
    private readonly ILogger<NoopMessageOfflineFallbackNotifier> _logger;

    public NoopMessageOfflineFallbackNotifier(ILogger<NoopMessageOfflineFallbackNotifier> logger)
    {
        _logger = logger;
    }

    public Task NotifyRecipientAsync(
        Guid recipientId,
        Guid threadId,
        Guid messageId,
        IReadOnlyCollection<string> channels,
        CancellationToken cancellationToken = default)
    {
        _ = cancellationToken;
        _logger.LogInformation(
            "Offline fallback notification hook invoked. RecipientId: {RecipientId}, ThreadId: {ThreadId}, MessageId: {MessageId}, Channels: {Channels}",
            recipientId,
            threadId,
            messageId,
            string.Join(",", channels));
        return Task.CompletedTask;
    }
}
