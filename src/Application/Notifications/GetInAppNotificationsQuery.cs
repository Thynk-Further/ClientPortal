using Application.Notifications.Dtos;
using MediatR;
using Shared;

namespace Application.Notifications;

public sealed record GetInAppNotificationsQuery(
    Guid UserId,
    int Page = 1,
    int PageSize = 20,
    bool UnreadOnly = false) : IRequest<Result<PagedResult<InAppNotificationItemDto>>>;
