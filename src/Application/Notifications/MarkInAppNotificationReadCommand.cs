using MediatR;
using Shared;

namespace Application.Notifications;

public sealed record MarkInAppNotificationReadCommand(
    Guid NotificationId,
    Guid UserId) : IRequest<Result>;
