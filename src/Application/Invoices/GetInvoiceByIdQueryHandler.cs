using Application.Clients.Abstractions;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using ClientEntity = Domain.Client;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class GetInvoiceByIdQueryHandler : IRequestHandler<GetInvoiceByIdQuery, Result<InvoiceDto>>
{
    private static readonly Error InvoiceNotFoundError = new("Invoices.NotFound", "Invoice was not found.", ErrorType.NotFound);
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IClientRepository _clientRepository;

    public GetInvoiceByIdQueryHandler(
        IInvoiceRepository invoiceRepository,
        IClientRepository clientRepository)
    {
        _invoiceRepository = invoiceRepository;
        _clientRepository = clientRepository;
    }

    public async Task<Result<InvoiceDto>> Handle(GetInvoiceByIdQuery request, CancellationToken cancellationToken)
    {
        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != request.ClientId)
        {
            return Result<InvoiceDto>.Failure(InvoiceNotFoundError);
        }

        ClientEntity? client = await _clientRepository.FindByIdAsync(invoice.ClientId, cancellationToken);

        return Result<InvoiceDto>.Success(
            InvoiceMapping.Map(invoice, client?.CompanyName ?? string.Empty));
    }
}
