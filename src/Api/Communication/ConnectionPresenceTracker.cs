using System.Collections.Concurrent;

namespace Api.Communication;

public interface IConnectionPresenceTracker
{
    bool AddConnection(string connectionId, Guid userId);

    ConnectionPresenceChange RemoveConnection(string connectionId);

    void JoinThread(string connectionId, Guid threadId);

    void LeaveThread(string connectionId, Guid threadId);

    bool IsUserOnline(Guid userId);

    DateTime? GetLastSeenUtc(Guid userId);
}

public sealed class ConnectionPresenceTracker : IConnectionPresenceTracker
{
    private readonly ConcurrentDictionary<string, ConnectionState> _connections = new();
    private readonly ConcurrentDictionary<Guid, HashSet<string>> _userConnections = new();
    private readonly ConcurrentDictionary<Guid, HashSet<string>> _threadConnections = new();
    private readonly ConcurrentDictionary<Guid, DateTime> _lastSeenUtc = new();
    private readonly Lock _gate = new();

    public bool AddConnection(string connectionId, Guid userId)
    {
        lock (_gate)
        {
            bool firstConnectionForUser = !_userConnections.TryGetValue(userId, out HashSet<string>? userSet) || userSet.Count == 0;

            _connections[connectionId] = new ConnectionState(userId);
            if (!_userConnections.TryGetValue(userId, out userSet))
            {
                userSet = [];
                _userConnections[userId] = userSet;
            }

            userSet.Add(connectionId);
            return firstConnectionForUser;
        }
    }

    public ConnectionPresenceChange RemoveConnection(string connectionId)
    {
        lock (_gate)
        {
            if (!_connections.TryRemove(connectionId, out ConnectionState? state))
            {
                return ConnectionPresenceChange.None;
            }

            if (_userConnections.TryGetValue(state.UserId, out HashSet<string>? userSet))
            {
                userSet.Remove(connectionId);
                if (userSet.Count == 0)
                {
                    _userConnections.TryRemove(state.UserId, out _);
                    DateTime lastSeen = DateTime.UtcNow;
                    _lastSeenUtc[state.UserId] = lastSeen;
                    return new ConnectionPresenceChange(state.UserId, false, lastSeen);
                }
            }

            foreach (Guid threadId in state.ThreadIds)
            {
                if (_threadConnections.TryGetValue(threadId, out HashSet<string>? threadSet))
                {
                    threadSet.Remove(connectionId);
                    if (threadSet.Count == 0)
                    {
                        _threadConnections.TryRemove(threadId, out _);
                    }
                }
            }

            return ConnectionPresenceChange.None;
        }
    }

    public void JoinThread(string connectionId, Guid threadId)
    {
        lock (_gate)
        {
            if (!_connections.TryGetValue(connectionId, out ConnectionState? state))
            {
                return;
            }

            state.ThreadIds.Add(threadId);
            if (!_threadConnections.TryGetValue(threadId, out HashSet<string>? threadSet))
            {
                threadSet = [];
                _threadConnections[threadId] = threadSet;
            }

            threadSet.Add(connectionId);
        }
    }

    public void LeaveThread(string connectionId, Guid threadId)
    {
        lock (_gate)
        {
            if (_connections.TryGetValue(connectionId, out ConnectionState? state))
            {
                state.ThreadIds.Remove(threadId);
            }

            if (_threadConnections.TryGetValue(threadId, out HashSet<string>? threadSet))
            {
                threadSet.Remove(connectionId);
                if (threadSet.Count == 0)
                {
                    _threadConnections.TryRemove(threadId, out _);
                }
            }
        }
    }

    public bool IsUserOnline(Guid userId)
    {
        lock (_gate)
        {
            return _userConnections.TryGetValue(userId, out HashSet<string>? userSet) && userSet.Count > 0;
        }
    }

    public DateTime? GetLastSeenUtc(Guid userId)
    {
        lock (_gate)
        {
            return _lastSeenUtc.TryGetValue(userId, out DateTime lastSeenUtc)
                ? lastSeenUtc
                : null;
        }
    }

    private sealed class ConnectionState
    {
        public ConnectionState(Guid userId)
        {
            UserId = userId;
        }

        public Guid UserId { get; }

        public HashSet<Guid> ThreadIds { get; } = [];
    }
}

public sealed record ConnectionPresenceChange(Guid UserId, bool IsOnline, DateTime At)
{
    public static ConnectionPresenceChange None => new(Guid.Empty, false, default);

    public bool HasValue => UserId != Guid.Empty;
}
