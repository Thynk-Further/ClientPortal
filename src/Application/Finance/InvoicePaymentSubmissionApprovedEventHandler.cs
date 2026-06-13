using Application.Clients.Abstractions;
using ClientEntity = Domain.Client;
using Application.Notifications.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Finance;

public sealed class InvoicePaymentSubmissionApprovedEventHandler
    : INotificationHandler<InvoicePaymentSubmissionApprovedEvent>
{
    private readonly IClientRepository _clientRepository;
    private readonly INotificationService _notificationService;
    private readonly ILogger<InvoicePaymentSubmissionApprovedEventHandler> _logger;

    public InvoicePaymentSubmissionApprovedEventHandler(
        IClientRepository clientRepository,
        INotificationService notificationService,
        ILogger<InvoicePaymentSubmissionApprovedEventHandler> logger)
    {
        _clientRepository = clientRepository;
        _notificationService = notificationService;
        _logger = logger;
    }

    public async Task Handle(InvoicePaymentSubmissionApprovedEvent notification, CancellationToken cancellationToken)
    {
        ClientEntity? client = await _clientRepository.FindByIdAsync(notification.ClientId, cancellationToken);
        if (client is null || string.IsNullOrWhiteSpace(client.Email.Value))
        {
            _logger.LogWarning(
                "Skipping payment approved notification for client {ClientId} because email is missing.",
                notification.ClientId);
            return;
        }

        await _notificationService.SendAsync(
            new NotificationMessage(
                NotificationChannel.Email,
                client.Email.Value,
                "Payment confirmed",
                $"Your payment for invoice {notification.InvoiceId:D} has been confirmed."),
            cancellationToken);
    }
}
