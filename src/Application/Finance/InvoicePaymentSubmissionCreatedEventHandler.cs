using Application.Invoices.Abstractions;
using Application.Notifications.Abstractions;
using Domain;
using MediatR;

namespace Application.Finance;

public sealed class InvoicePaymentSubmissionCreatedEventHandler
    : INotificationHandler<InvoicePaymentSubmissionCreatedEvent>
{
    private readonly IInvoiceBusinessStaffRecipientProvider _staffRecipientProvider;
    private readonly INotificationService _notificationService;

    public InvoicePaymentSubmissionCreatedEventHandler(
        IInvoiceBusinessStaffRecipientProvider staffRecipientProvider,
        INotificationService notificationService)
    {
        _staffRecipientProvider = staffRecipientProvider;
        _notificationService = notificationService;
    }

    public async Task Handle(InvoicePaymentSubmissionCreatedEvent notification, CancellationToken cancellationToken)
    {
        IReadOnlyList<string> recipients = _staffRecipientProvider.GetReceiptConfirmationEmailRecipients();
        foreach (string recipient in recipients)
        {
            await _notificationService.SendAsync(
                new NotificationMessage(
                    NotificationChannel.Email,
                    recipient,
                    "Payment proof submitted",
                    $"A client submitted payment proof for invoice {notification.InvoiceId:D}. Please review and confirm."),
                cancellationToken);
        }
    }
}
