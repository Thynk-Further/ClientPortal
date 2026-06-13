using Application.Invoices.Abstractions;
using Application.Notifications.Abstractions;
using Domain;
using MediatR;

namespace Application.Finance;

public sealed class RfqSubmittedEventHandler : INotificationHandler<RfqSubmittedEvent>
{
    private readonly IInvoiceBusinessStaffRecipientProvider _staffRecipientProvider;
    private readonly INotificationService _notificationService;

    public RfqSubmittedEventHandler(
        IInvoiceBusinessStaffRecipientProvider staffRecipientProvider,
        INotificationService notificationService)
    {
        _staffRecipientProvider = staffRecipientProvider;
        _notificationService = notificationService;
    }

    public async Task Handle(RfqSubmittedEvent notification, CancellationToken cancellationToken)
    {
        IReadOnlyList<string> recipients = _staffRecipientProvider.GetReceiptConfirmationEmailRecipients();
        foreach (string recipient in recipients)
        {
            await _notificationService.SendAsync(
                new NotificationMessage(
                    NotificationChannel.Email,
                    recipient,
                    "New RFQ submitted",
                    $"A client has submitted a new request for quotation (RFQ {notification.RfqId:D})."),
                cancellationToken);
        }
    }
}
