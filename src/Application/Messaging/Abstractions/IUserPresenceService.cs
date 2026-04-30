namespace Application.Messaging.Abstractions;

public interface IUserPresenceService
{
    bool IsOnline(Guid userId);

    DateTime? GetLastSeenUtc(Guid userId);
}
