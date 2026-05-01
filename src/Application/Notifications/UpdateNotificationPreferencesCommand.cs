using Application.Notifications.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Notifications;

public sealed record UpdateNotificationPreferencesCommand(
    Guid UserId,
    bool EmailEnabled,
    bool WhatsAppEnabled,
    bool SmsEnabled,
    bool InAppEnabled,
    NotificationPreferenceFrequency Frequency) : IRequest<Result<NotificationPreferencesDto>>;
