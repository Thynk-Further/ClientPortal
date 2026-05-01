using Application.Abstractions;
using Application.Notifications.Abstractions;
using Application.Notifications.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Notifications;

public sealed class UpdateNotificationPreferencesCommandHandler
    : IRequestHandler<UpdateNotificationPreferencesCommand, Result<NotificationPreferencesDto>>
{
    private readonly INotificationPreferencesRepository _notificationPreferencesRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateNotificationPreferencesCommandHandler(
        INotificationPreferencesRepository notificationPreferencesRepository,
        IUnitOfWork unitOfWork)
    {
        _notificationPreferencesRepository = notificationPreferencesRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<NotificationPreferencesDto>> Handle(
        UpdateNotificationPreferencesCommand request,
        CancellationToken cancellationToken)
    {
        UserNotificationPreferences? existing = await _notificationPreferencesRepository.FindByUserIdAsync(request.UserId, cancellationToken);
        if (existing is null)
        {
            UserNotificationPreferences created = UserNotificationPreferences.Create(
                Guid.CreateVersion7(),
                request.UserId,
                request.EmailEnabled,
                request.WhatsAppEnabled,
                request.SmsEnabled,
                request.InAppEnabled,
                request.Frequency);

            _notificationPreferencesRepository.Add(created);
        }
        else
        {
            existing.Update(
                request.EmailEnabled,
                request.WhatsAppEnabled,
                request.SmsEnabled,
                request.InAppEnabled,
                request.Frequency);

            _notificationPreferencesRepository.Update(existing);
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        NotificationPreferencesDto updated = await _notificationPreferencesRepository.GetOrDefaultAsync(request.UserId, cancellationToken);
        return Result<NotificationPreferencesDto>.Success(updated);
    }
}
