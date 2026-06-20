using Application.Tenancy.Dtos;
using MediatR;
using Shared;

namespace Application.Tenancy;

public sealed record UpdateTenantNotificationChannelsCommand(
    bool EmailEnabled,
    bool InAppEnabled,
    bool SmsEnabled,
    bool WeeklyDigestEnabled) : IRequest<Result<TenantNotificationChannelsDto>>;
