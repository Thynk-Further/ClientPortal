using Application.Clients.Abstractions;
using ClientEntity = Domain.Client;
using Application.Notifications.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Finance;

public sealed class PurchaseOrderApprovedEventHandler : INotificationHandler<PurchaseOrderApprovedEvent>
{
    private readonly IClientRepository _clientRepository;
    private readonly INotificationService _notificationService;
    private readonly ILogger<PurchaseOrderApprovedEventHandler> _logger;

    public PurchaseOrderApprovedEventHandler(
        IClientRepository clientRepository,
        INotificationService notificationService,
        ILogger<PurchaseOrderApprovedEventHandler> logger)
    {
        _clientRepository = clientRepository;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Handle(PurchaseOrderApprovedEvent notification, CancellationToken cancellationToken)
    {
        ClientEntity? client = await _clientRepository.FindByIdAsync(notification.ClientId, cancellationToken);
        if (client is null || string.IsNullOrWhiteSpace(client.Email.Value))
        {
            _logger.LogWarning(
                "Skipping PO approved notification for client {ClientId} because email is missing.",
                notification.ClientId);
            return;
        }

        await _notificationService.SendAsync(
            new NotificationMessage(
                NotificationChannel.Email,
                client.Email.Value,
                "Purchase order approved",
                "Your purchase order has been approved. A draft invoice is being prepared and will be sent shortly."),
            cancellationToken);
    }
}
