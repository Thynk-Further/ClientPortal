using Application.Notifications.Abstractions;
using Application.Team.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Team;

public sealed class StaffInvitedEventHandler : INotificationHandler<StaffInvitedEvent>
{
    private readonly IStaffInvitationLinkFactory _staffInvitationLinkFactory;
    private readonly INotificationService _notificationService;
    private readonly ILogger<StaffInvitedEventHandler> _logger;

    public StaffInvitedEventHandler(
        IStaffInvitationLinkFactory staffInvitationLinkFactory,
        INotificationService notificationService,
        ILogger<StaffInvitedEventHandler> logger)
    {
        _staffInvitationLinkFactory = staffInvitationLinkFactory;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Handle(StaffInvitedEvent notification, CancellationToken cancellationToken)
    {
        string inviteLink = _staffInvitationLinkFactory.CreateAcceptInvitationLink(
            notification.InviteToken,
            notification.TenantSlug);

        string subject = "You are invited to join a business team";
        string body =
            $"Hello {notification.FullName},\n\n" +
            "You have been invited to join a business team on ClientPortal.\n" +
            "Use this secure link to set your password and activate your account:\n" +
            $"{inviteLink}\n\n" +
            "This link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.";

        try
        {
            Dictionary<string, string> metadata = new(StringComparer.Ordinal)
            {
                ["userId"] = notification.UserId.ToString()
            };

            await _notificationService.SendAsync(
                new NotificationMessage(
                    NotificationChannel.Email,
                    notification.RecipientEmail,
                    subject,
                    body,
                    metadata),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to send staff invitation email for user {UserId}.",
                notification.UserId);
        }
    }
}
