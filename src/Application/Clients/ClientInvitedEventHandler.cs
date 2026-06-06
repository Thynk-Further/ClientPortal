using Application.Clients.Abstractions;
using Application.Notifications.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Clients;

public sealed class ClientInvitedEventHandler : INotificationHandler<ClientInvitedEvent>
{
    private readonly IClientInvitationLinkFactory _clientInvitationLinkFactory;
    private readonly INotificationService _notificationService;
    private readonly ILogger<ClientInvitedEventHandler> _logger;

    public ClientInvitedEventHandler(
        IClientInvitationLinkFactory clientInvitationLinkFactory,
        INotificationService notificationService,
        ILogger<ClientInvitedEventHandler> logger)
    {
        _clientInvitationLinkFactory = clientInvitationLinkFactory;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Handle(ClientInvitedEvent notification, CancellationToken cancellationToken)
    {
        string inviteLink = _clientInvitationLinkFactory.CreateAcceptInvitationLink(notification.InviteToken);

        string subject = "You are invited to your client portal";
        string body =
            $"Hello {notification.ContactName},\n\n" +
            "You have been invited to collaborate with a business on ClientPortal.\n" +
            "Use this secure link to set your password and activate your account:\n" +
            $"{inviteLink}\n\n" +
            "This link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.";

        try
        {
            Dictionary<string, string> metadata = new(StringComparer.Ordinal)
            {
                ["userId"] = notification.ClientUserId.ToString()
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
                "Failed to send client invitation email for client {ClientId} and user {ClientUserId}.",
                notification.ClientId,
                notification.ClientUserId);
        }
    }
}
