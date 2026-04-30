namespace Application.Messaging.Abstractions;

public interface IMessageOfflineFallbackNotifier
{
    Task NotifyRecipientAsync(
        Guid recipientId,
        Guid threadId,
        Guid messageId,
        IReadOnlyCollection<string> channels,
        CancellationToken cancellationToken = default);
}
