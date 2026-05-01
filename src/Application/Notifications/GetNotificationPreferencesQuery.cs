using Application.Notifications.Dtos;
using MediatR;
using Shared;

namespace Application.Notifications;

public sealed record GetNotificationPreferencesQuery(Guid UserId) : IRequest<Result<NotificationPreferencesDto>>;
