using Application.Notifications.Abstractions;
using Application.Notifications.Dtos;
using MediatR;
using Shared;

namespace Application.Notifications;

public sealed class GetInAppNotificationsQueryHandler
    : IRequestHandler<GetInAppNotificationsQuery, Result<PagedResult<InAppNotificationItemDto>>>
{
    private readonly IInAppNotificationRepository _inAppNotificationRepository;

    public GetInAppNotificationsQueryHandler(IInAppNotificationRepository inAppNotificationRepository)
    {
        _inAppNotificationRepository = inAppNotificationRepository;
    }

    public async Task<Result<PagedResult<InAppNotificationItemDto>>> Handle(
        GetInAppNotificationsQuery request,
        CancellationToken cancellationToken)
    {
        PagedResult<InAppNotificationItemDto> result = await _inAppNotificationRepository.GetPagedForUserAsync(
            request.UserId,
            request.Page,
            request.PageSize,
            request.UnreadOnly,
            cancellationToken);

        return Result<PagedResult<InAppNotificationItemDto>>.Success(result);
    }
}
