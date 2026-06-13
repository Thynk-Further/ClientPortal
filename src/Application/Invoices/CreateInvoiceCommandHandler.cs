using Application.Abstractions;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class CreateInvoiceCommandHandler : IRequestHandler<CreateInvoiceCommand, Result<InvoiceDto>>
{
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly ICurrentTenant _currentTenant;
    private readonly ITaxCalculator _taxCalculator;
    private readonly IUnitOfWork _unitOfWork;

    public CreateInvoiceCommandHandler(
        IInvoiceRepository invoiceRepository,
        ICurrentTenant currentTenant,
        ITaxCalculator taxCalculator,
        IUnitOfWork unitOfWork)
    {
        _invoiceRepository = invoiceRepository;
        _currentTenant = currentTenant;
        _taxCalculator = taxCalculator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<InvoiceDto>> Handle(CreateInvoiceCommand request, CancellationToken cancellationToken)
    {
        decimal tenantTaxRate = _taxCalculator.ResolveDefaultRate(_currentTenant.Settings);
        List<LineItem> lineItems = request.LineItems
            .Select(item => new LineItem(
                description: item.Description,
                quantity: item.Quantity,
                unitPrice: item.UnitPrice,
                taxRate: item.TaxRate > 0m ? item.TaxRate : tenantTaxRate))
            .ToList();

        Invoice invoice = Invoice.Create(
            id: Guid.CreateVersion7(),
            clientId: request.ClientId,
            projectId: request.ProjectId,
            invoiceNumber: request.InvoiceNumber,
            lineItems: lineItems,
            currency: request.Currency,
            dueDate: request.DueDate,
            notes: request.Notes);

        _invoiceRepository.Add(invoice);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InvoiceDto>.Success(InvoiceMapping.Map(invoice));
    }
}
