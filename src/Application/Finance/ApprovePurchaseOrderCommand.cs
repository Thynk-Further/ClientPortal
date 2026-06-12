using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record ApprovePurchaseOrderCommand(
    Guid PurchaseOrderId,
    Guid ClientId,
    string InvoiceNumber,
    DateOnly DueDate) : IRequest<Result<InvoiceDto>>;
