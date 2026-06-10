using Application.Notifications.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record UpdateClientPortalNotificationPreferencesCommand(
    bool EmailEnabled,
    bool WhatsAppEnabled,
    bool SmsEnabled,
    bool InAppEnabled,
    NotificationPreferenceFrequency Frequency) : IRequest<Result<NotificationPreferencesDto>>;
