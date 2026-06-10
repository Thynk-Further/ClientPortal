using Application.Notifications.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record GetClientPortalNotificationPreferencesQuery
    : IRequest<Result<NotificationPreferencesDto>>;
