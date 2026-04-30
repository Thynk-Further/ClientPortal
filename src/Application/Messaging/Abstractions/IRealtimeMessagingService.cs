using Application.Messaging.Dtos;

namespace Application.Messaging.Abstractions;

public interface IRealtimeMessagingService
{
    Task JoinThreadAsync(Guid userId, Guid threadId, CancellationToken cancellationToken = default);

    Task LeaveThreadAsync(Guid userId, Guid threadId, CancellationToken cancellationToken = default);

    Task BroadcastMessageAsync(RealtimeMessagePayload payload, CancellationToken cancellationToken = default);

    Task BroadcastDeliveryReceiptAsync(RealtimeDeliveryReceiptPayload payload, CancellationToken cancellationToken = default);

    Task BroadcastReadReceiptAsync(RealtimeReadReceiptPayload payload, CancellationToken cancellationToken = default);

    Task BroadcastTypingAsync(RealtimeTypingPayload payload, CancellationToken cancellationToken = default);

    Task BroadcastPresenceAsync(RealtimePresencePayload payload, CancellationToken cancellationToken = default);
}
