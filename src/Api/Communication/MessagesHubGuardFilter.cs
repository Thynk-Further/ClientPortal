using Microsoft.AspNetCore.SignalR;
using System.Collections;
using System.Collections.Concurrent;
using System.Linq;
using System.Security.Claims;

namespace Api.Communication;

public sealed class MessagesHubGuardFilter : IHubFilter
{
    private const int DefaultLimitPerWindow = 30;
    private const int TypingLimitPerWindow = 120;
    private static readonly TimeSpan Window = TimeSpan.FromSeconds(10);
    private const int MaxStringLength = 4096;
    private const int MaxCollectionItems = 200;
    private const int MaxRecoverSequenceGap = 250_000;

    private readonly ConcurrentDictionary<string, FixedWindowCounter> _counters = new();
    private readonly ILogger<MessagesHubGuardFilter> _logger;

    public MessagesHubGuardFilter(ILogger<MessagesHubGuardFilter> logger)
    {
        _logger = logger;
    }

    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        ValidatePayload(invocationContext);
        EnsureRateLimit(invocationContext);
        return await next(invocationContext);
    }

    public async Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
    {
        _ = context;
        await next(context);
    }

    public async Task OnDisconnectedAsync(
        HubLifetimeContext context,
        Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        _ = exception;
        _counters.Keys
            .Where(key => key.StartsWith($"{context.Context.ConnectionId}|", StringComparison.Ordinal))
            .ToList()
            .ForEach(key => _counters.TryRemove(key, out _));

        await next(context, exception);
    }

    private void EnsureRateLimit(HubInvocationContext invocationContext)
    {
        string methodName = invocationContext.HubMethodName;
        string userKey = ResolveUserKey(invocationContext.Context.User, invocationContext.Context.ConnectionId);
        string counterKey = $"{invocationContext.Context.ConnectionId}|{userKey}|{methodName}";
        int limit = GetWindowLimit(methodName);

        FixedWindowCounter counter = _counters.GetOrAdd(counterKey, _ => new FixedWindowCounter(Window));
        if (!counter.TryAcquire(limit))
        {
            _logger.LogWarning(
                "SignalR rate limit exceeded. Method: {MethodName}, UserKey: {UserKey}, ConnectionId: {ConnectionId}",
                methodName,
                userKey,
                invocationContext.Context.ConnectionId);
            throw new HubException("Too many requests. Slow down and retry.");
        }
    }

    private static int GetWindowLimit(string methodName)
    {
        return string.Equals(methodName, nameof(MessagesHub.BroadcastTypingAsync), StringComparison.Ordinal)
            ? TypingLimitPerWindow
            : DefaultLimitPerWindow;
    }

    private void ValidatePayload(HubInvocationContext invocationContext)
    {
        if (invocationContext.HubMethodArguments.Count == 0)
        {
            return;
        }

        string methodName = invocationContext.HubMethodName;
        foreach (object? arg in invocationContext.HubMethodArguments)
        {
            ValidateArgument(methodName, arg);
        }

        if (string.Equals(methodName, nameof(MessagesHub.RecoverThreadAsync), StringComparison.Ordinal) &&
            invocationContext.HubMethodArguments.Count >= 2 &&
            invocationContext.HubMethodArguments[1] is long lastSeenSequenceNumber &&
            (lastSeenSequenceNumber < 0 || lastSeenSequenceNumber > MaxRecoverSequenceGap))
        {
            throw new HubException("Invalid recovery sequence range.");
        }
    }

    private void ValidateArgument(string methodName, object? value)
    {
        if (value is null)
        {
            throw new HubException($"Invalid payload for {methodName}.");
        }

        switch (value)
        {
            case string text when string.IsNullOrWhiteSpace(text):
                throw new HubException($"Invalid payload for {methodName}.");
            case string text when text.Length > MaxStringLength:
                throw new HubException("Payload too large.");
            case Guid guid when guid == Guid.Empty:
                throw new HubException($"Invalid payload for {methodName}.");
            case IEnumerable enumerable when value is not string:
                int itemCount = 0;
                foreach (object? _ in enumerable)
                {
                    itemCount++;
                    if (itemCount > MaxCollectionItems)
                    {
                        throw new HubException("Payload collection too large.");
                    }
                }

                break;
        }
    }

    private static string ResolveUserKey(ClaimsPrincipal? user, string connectionId)
    {
        string? userId = user?.FindFirstValue("userId");
        if (!string.IsNullOrWhiteSpace(userId))
        {
            return userId;
        }

        return $"conn:{connectionId}";
    }

    private sealed class FixedWindowCounter
    {
        private readonly TimeSpan _windowSize;
        private readonly Lock _gate = new();
        private DateTime _windowStart = DateTime.UtcNow;
        private int _count;

        public FixedWindowCounter(TimeSpan windowSize)
        {
            _windowSize = windowSize;
        }

        public bool TryAcquire(int permitLimit)
        {
            DateTime now = DateTime.UtcNow;
            lock (_gate)
            {
                if (now - _windowStart >= _windowSize)
                {
                    _windowStart = now;
                    _count = 0;
                }

                if (_count >= permitLimit)
                {
                    return false;
                }

                _count++;
                return true;
            }
        }
    }
}
