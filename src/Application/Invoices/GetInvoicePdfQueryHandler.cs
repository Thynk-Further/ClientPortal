using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class GetInvoicePdfQueryHandler : IRequestHandler<GetInvoicePdfQuery, Result<InvoicePdfDocument>>
{
    private static readonly Error InvoiceNotFoundError = new("Invoices.NotFound", "Invoice was not found.", ErrorType.NotFound);

    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IInvoicePdfGenerator _invoicePdfGenerator;

    public GetInvoicePdfQueryHandler(IInvoiceRepository invoiceRepository, IInvoicePdfGenerator invoicePdfGenerator)
    {
        _invoiceRepository = invoiceRepository;
        _invoicePdfGenerator = invoicePdfGenerator;
    }

    public async Task<Result<InvoicePdfDocument>> Handle(GetInvoicePdfQuery request, CancellationToken cancellationToken)
    {
        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != request.ClientId)
        {
            return Result<InvoicePdfDocument>.Failure(InvoiceNotFoundError);
        }

        InvoicePdfDocument pdf = await _invoicePdfGenerator.GenerateAsync(invoice, cancellationToken);
        return Result<InvoicePdfDocument>.Success(pdf);
    }
}
