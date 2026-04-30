using Application.Messaging.Abstractions;

namespace Api.Communication;

public sealed class ConnectionPresenceService : IUserPresenceService
{
    private readonly IConnectionPresenceTracker _presenceTracker;

    public ConnectionPresenceService(IConnectionPresenceTracker presenceTracker)
    {
        _presenceTracker = presenceTracker;
    }

    public bool IsOnline(Guid userId)
    {
        return _presenceTracker.IsUserOnline(userId);
    }

    public DateTime? GetLastSeenUtc(Guid userId)
    {
        return _presenceTracker.GetLastSeenUtc(userId);
    }
}
