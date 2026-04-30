using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class GetInvoiceByIdQueryHandler : IRequestHandler<GetInvoiceByIdQuery, Result<InvoiceDto>>
{
    private static readonly Error InvoiceNotFoundError = new("Invoices.NotFound", "Invoice was not found.", ErrorType.NotFound);
    private readonly IInvoiceRepository _invoiceRepository;

    public GetInvoiceByIdQueryHandler(IInvoiceRepository invoiceRepository)
    {
        _invoiceRepository = invoiceRepository;
    }

    public async Task<Result<InvoiceDto>> Handle(GetInvoiceByIdQuery request, CancellationToken cancellationToken)
    {
        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != request.ClientId)
        {
            return Result<InvoiceDto>.Failure(InvoiceNotFoundError);
        }

        return Result<InvoiceDto>.Success(CreateInvoiceCommandHandler.Map(invoice));
    }
}
