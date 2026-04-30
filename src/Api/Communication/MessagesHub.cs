using Application.Abstractions;
using Application.Messaging;
using Application.Messaging.Abstractions;
using Application.Messaging.Dtos;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Api.Communication;

[Authorize]
public sealed class MessagesHub : Hub
{
    private readonly IMessageThreadRepository _messageThreadRepository;
    private readonly ICurrentTenant _currentTenant;
    private readonly IConnectionPresenceTracker _presenceTracker;
    private readonly ISender _sender;
    private readonly ILogger<MessagesHub> _logger;

    public MessagesHub(
        IMessageThreadRepository messageThreadRepository,
        ICurrentTenant currentTenant,
        IConnectionPresenceTracker presenceTracker,
        ISender sender,
        ILogger<MessagesHub> logger)
    {
        _messageThreadRepository = messageThreadRepository;
        _currentTenant = currentTenant;
        _presenceTracker = presenceTracker;
        _sender = sender;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        EnsureTenantResolved();
        Guid userId = GetCurrentUserId();
        bool isFirstConnection = _presenceTracker.AddConnection(Context.ConnectionId, userId);

        string tenantGroup = TenantGroup(_currentTenant.Slug!);
        await Groups.AddToGroupAsync(Context.ConnectionId, tenantGroup);
        if (isFirstConnection)
        {
            await Clients.Group(tenantGroup).SendAsync(
                "presence-updated",
                new RealtimePresencePayload(userId, true, DateTime.UtcNow));
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        ConnectionPresenceChange change = _presenceTracker.RemoveConnection(Context.ConnectionId);
        if (_currentTenant.IsResolved && change.HasValue)
        {
            string tenantGroup = TenantGroup(_currentTenant.Slug!);
            await Clients.Group(tenantGroup).SendAsync(
                "presence-updated",
                new RealtimePresencePayload(change.UserId, false, change.At));
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinThreadAsync(Guid threadId)
    {
        Guid userId = GetCurrentUserId();
        await EnsureThreadParticipantAsync(threadId, userId, Context.ConnectionAborted);

        await Groups.AddToGroupAsync(Context.ConnectionId, ThreadGroup(threadId));
        _presenceTracker.JoinThread(Context.ConnectionId, threadId);
        _ = await _sender.Send(new MarkThreadDeliveredCommand(threadId, userId), Context.ConnectionAborted);
    }

    public async Task LeaveThreadAsync(Guid threadId)
    {
        Guid userId = GetCurrentUserId();
        await EnsureThreadParticipantAsync(threadId, userId, Context.ConnectionAborted);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, ThreadGroup(threadId));
        _presenceTracker.LeaveThread(Context.ConnectionId, threadId);
    }

    public async Task BroadcastTypingAsync(Guid threadId, bool isTyping)
    {
        Guid userId = GetCurrentUserId();
        await EnsureThreadParticipantAsync(threadId, userId, Context.ConnectionAborted);

        string eventName = isTyping ? "user-typing" : "user-stopped-typing";
        await Clients.GroupExcept(ThreadGroup(threadId), Context.ConnectionId).SendAsync(
            eventName,
            new RealtimeTypingPayload(threadId, userId, isTyping, DateTime.UtcNow));
    }

    public async Task RecoverThreadAsync(Guid threadId, long lastSeenSequenceNumber)
    {
        Guid userId = GetCurrentUserId();
        await EnsureThreadParticipantAsync(threadId, userId, Context.ConnectionAborted);

        // History and pagination remain REST-owned to keep one source of truth.
        await Clients.Caller.SendAsync(
            "thread-resync-required",
            threadId,
            Math.Max(0, lastSeenSequenceNumber),
            Context.ConnectionAborted);
    }

    public static string ThreadGroup(Guid threadId) => $"thread:{threadId:D}";

    public static string TenantGroup(string tenantSlug) => $"tenant:{tenantSlug}";

    private async Task EnsureThreadParticipantAsync(Guid threadId, Guid userId, CancellationToken cancellationToken)
    {
        Domain.MessageThread? thread = await _messageThreadRepository.FindByIdAsync(threadId, cancellationToken);
        if (thread is null || !thread.Participants.Contains(userId))
        {
            _logger.LogWarning("User {UserId} denied hub thread access for {ThreadId}.", userId, threadId);
            throw new HubException("You are not authorized for this thread.");
        }
    }

    private void EnsureTenantResolved()
    {
        if (!_currentTenant.IsResolved || string.IsNullOrWhiteSpace(_currentTenant.Slug))
        {
            throw new HubException("Tenant context is required.");
        }
    }

    private Guid GetCurrentUserId()
    {
        Guid userId = TryGetCurrentUserId();
        if (userId == Guid.Empty)
        {
            throw new HubException("Authenticated user context is invalid.");
        }

        return userId;
    }

    private Guid TryGetCurrentUserId()
    {
        string? userIdValue = Context.User?.FindFirstValue("userId");
        return Guid.TryParse(userIdValue, out Guid userId) ? userId : Guid.Empty;
    }
}
