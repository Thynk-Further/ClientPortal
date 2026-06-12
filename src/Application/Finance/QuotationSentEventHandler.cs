using Application.Clients.Abstractions;
using ClientEntity = Domain.Client;
using Application.Notifications.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Finance;

public sealed class QuotationSentEventHandler : INotificationHandler<QuotationSentEvent>
{
    private readonly IClientRepository _clientRepository;
    private readonly INotificationService _notificationService;
    private readonly ILogger<QuotationSentEventHandler> _logger;

    public QuotationSentEventHandler(
        IClientRepository clientRepository,
        INotificationService notificationService,
        ILogger<QuotationSentEventHandler> logger)
    {
        _clientRepository = clientRepository;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Handle(QuotationSentEvent notification, CancellationToken cancellationToken)
    {
        ClientEntity? client = await _clientRepository.FindByIdAsync(notification.ClientId, cancellationToken);
        if (client is null || string.IsNullOrWhiteSpace(client.Email.Value))
        {
            _logger.LogWarning(
                "Skipping quotation sent notification for client {ClientId} because email is missing.",
                notification.ClientId);
            return;
        }

        await _notificationService.SendAsync(
            new NotificationMessage(
                NotificationChannel.Email,
                client.Email.Value,
                "Quotation ready for review",
                "A new quotation is available for your review in the client portal."),
            cancellationToken);
    }
}
