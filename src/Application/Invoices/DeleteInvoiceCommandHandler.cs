using Application.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class DeleteInvoiceCommandHandler : IRequestHandler<DeleteInvoiceCommand, Result>
{
    private static readonly Error InvoiceNotFoundError = new("Invoices.NotFound", "Invoice was not found.", ErrorType.NotFound);

    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteInvoiceCommandHandler(IInvoiceRepository invoiceRepository, IUnitOfWork unitOfWork)
    {
        _invoiceRepository = invoiceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteInvoiceCommand request, CancellationToken cancellationToken)
    {
        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != request.ClientId)
        {
            return Result.Failure(InvoiceNotFoundError);
        }

        _invoiceRepository.Delete(invoice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
