using Application.Clients.Abstractions;
using Application.Clients.Dtos;
using Application.Invoices;
using Application.Invoices.Dtos;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed class GetClientPortalInvoiceByIdQueryHandler
    : IRequestHandler<GetClientPortalInvoiceByIdQuery, Result<ClientPortalInvoiceDetailDto>>
{
    private static readonly Error InvoiceNotFoundError = new(
        "Invoices.NotFound",
        "Invoice was not found.",
        ErrorType.NotFound);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly ISender _sender;

    public GetClientPortalInvoiceByIdQueryHandler(
        ICurrentClientResolver currentClientResolver,
        ISender sender)
    {
        _currentClientResolver = currentClientResolver;
        _sender = sender;
    }

    public async Task<Result<ClientPortalInvoiceDetailDto>> Handle(
        GetClientPortalInvoiceByIdQuery request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalInvoiceDetailDto>.Failure(clientIdResult.Errors);
        }

        Result<InvoiceDto> invoiceResult = await _sender.Send(
            new GetInvoiceByIdQuery(request.InvoiceId, clientIdResult.Value),
            cancellationToken);

        if (invoiceResult.IsFailed || invoiceResult.Value is null)
        {
            return Result<ClientPortalInvoiceDetailDto>.Failure(
                invoiceResult.Errors.Count > 0 ? invoiceResult.Errors : [InvoiceNotFoundError]);
        }

        InvoiceDto invoice = invoiceResult.Value;
        if (invoice.Status == Domain.InvoiceStatus.Draft)
        {
            return Result<ClientPortalInvoiceDetailDto>.Failure(InvoiceNotFoundError);
        }

        decimal outstandingAmount = decimal.Round(
            Math.Max(0m, invoice.Total - invoice.AmountPaid),
            2,
            MidpointRounding.ToEven);

        ClientPortalInvoiceDetailDto detail = new(
            invoice.Id,
            invoice.ProjectId,
            invoice.InvoiceNumber,
            invoice.Status,
            invoice.LineItems,
            invoice.Subtotal,
            invoice.TaxAmount,
            invoice.Total,
            invoice.AmountPaid,
            outstandingAmount,
            invoice.Currency,
            invoice.DueDate,
            invoice.PaidAt,
            invoice.Notes,
            invoice.CreatedAt);

        return Result<ClientPortalInvoiceDetailDto>.Success(detail);
    }
}
