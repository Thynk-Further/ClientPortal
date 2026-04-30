using Application.Abstractions;
using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using Microsoft.AspNetCore.SignalR;

namespace Api.Communication;

public sealed class SignalRRealtimeMessagingService : IRealtimeMessagingService
{
    private readonly IHubContext<MessagesHub> _hubContext;
    private readonly ICurrentTenant _currentTenant;

    public SignalRRealtimeMessagingService(
        IHubContext<MessagesHub> hubContext,
        ICurrentTenant currentTenant)
    {
        _hubContext = hubContext;
        _currentTenant = currentTenant;
    }

    public Task JoinThreadAsync(Guid userId, Guid threadId, CancellationToken cancellationToken = default)
    {
        _ = userId;
        _ = threadId;
        _ = cancellationToken;
        return Task.CompletedTask;
    }

    public Task LeaveThreadAsync(Guid userId, Guid threadId, CancellationToken cancellationToken = default)
    {
        _ = userId;
        _ = threadId;
        _ = cancellationToken;
        return Task.CompletedTask;
    }

    public Task BroadcastMessageAsync(RealtimeMessagePayload payload, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(MessagesHub.ThreadGroup(payload.ThreadId))
            .SendAsync("message-received", payload, cancellationToken);
    }

    public Task BroadcastDeliveryReceiptAsync(RealtimeDeliveryReceiptPayload payload, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(MessagesHub.ThreadGroup(payload.ThreadId))
            .SendAsync("delivery-receipt", payload, cancellationToken);
    }

    public Task BroadcastReadReceiptAsync(RealtimeReadReceiptPayload payload, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(MessagesHub.ThreadGroup(payload.ThreadId))
            .SendAsync("read-receipt", payload, cancellationToken);
    }

    public Task BroadcastTypingAsync(RealtimeTypingPayload payload, CancellationToken cancellationToken = default)
    {
        string eventName = payload.IsTyping ? "user-typing" : "user-stopped-typing";
        return _hubContext.Clients
            .Group(MessagesHub.ThreadGroup(payload.ThreadId))
            .SendAsync(eventName, payload, cancellationToken);
    }

    public Task BroadcastPresenceAsync(RealtimePresencePayload payload, CancellationToken cancellationToken = default)
    {
        if (!_currentTenant.IsResolved || string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            return Task.CompletedTask;
        }

        return _hubContext.Clients
            .Group(MessagesHub.TenantGroup(_currentTenant.Slug))
            .SendAsync("presence-updated", payload, cancellationToken);
    }
}
