using Application.Abstractions;
using Application.Notifications.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Notifications;

public sealed class MarkInAppNotificationReadCommandHandler : IRequestHandler<MarkInAppNotificationReadCommand, Result>
{
    private static readonly Error NotificationNotFoundError = new(
        "Notifications.NotFound",
        "Notification was not found.",
        ErrorType.NotFound);

    private static readonly Error NotificationForbiddenError = new(
        "Notifications.Forbidden",
        "Notification does not belong to the current user.",
        ErrorType.Forbidden);

    private readonly IInAppNotificationRepository _inAppNotificationRepository;
    private readonly IUnitOfWork _unitOfWork;

    public MarkInAppNotificationReadCommandHandler(
        IInAppNotificationRepository inAppNotificationRepository,
        IUnitOfWork unitOfWork)
    {
        _inAppNotificationRepository = inAppNotificationRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(MarkInAppNotificationReadCommand request, CancellationToken cancellationToken)
    {
        InAppNotification? notification = await _inAppNotificationRepository.FindByIdAsync(request.NotificationId, cancellationToken);
        if (notification is null)
        {
            return Result.Failure(NotificationNotFoundError);
        }

        if (notification.UserId != request.UserId)
        {
            return Result.Failure(NotificationForbiddenError);
        }

        notification.MarkRead(DateTime.UtcNow);
        _inAppNotificationRepository.Update(notification);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
