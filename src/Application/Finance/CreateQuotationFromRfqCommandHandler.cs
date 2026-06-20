using Application.Abstractions;
using Application.Finance.Abstractions;
using Application.Invoices;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class CreateQuotationFromRfqCommandHandler
    : IRequestHandler<CreateQuotationFromRfqCommand, Result<QuoteDto>>
{
    private static readonly Error RfqNotFoundError = new("Rfqs.NotFound", "RFQ was not found.", ErrorType.NotFound);
    private static readonly Error RfqInvalidStateError = new("Rfqs.InvalidState", "Only submitted RFQs can receive quotations.", ErrorType.Conflict);

    private readonly IRfqRepository _rfqRepository;
    private readonly IQuoteRepository _quoteRepository;
    private readonly ICurrentTenant _currentTenant;
    private readonly ITaxCalculator _taxCalculator;
    private readonly IUnitOfWork _unitOfWork;

    public CreateQuotationFromRfqCommandHandler(
        IRfqRepository rfqRepository,
        IQuoteRepository quoteRepository,
        ICurrentTenant currentTenant,
        ITaxCalculator taxCalculator,
        IUnitOfWork unitOfWork)
    {
        _rfqRepository = rfqRepository;
        _quoteRepository = quoteRepository;
        _currentTenant = currentTenant;
        _taxCalculator = taxCalculator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<QuoteDto>> Handle(CreateQuotationFromRfqCommand request, CancellationToken cancellationToken)
    {
        Rfq? rfq = await _rfqRepository.FindByIdAsync(request.RfqId, cancellationToken);
        if (rfq is null || rfq.ClientId != request.ClientId)
        {
            return Result<QuoteDto>.Failure(RfqNotFoundError);
        }

        if (rfq.Status != RfqStatus.Submitted)
        {
            return Result<QuoteDto>.Failure(RfqInvalidStateError);
        }

        decimal defaultTaxRate = _taxCalculator.ResolveDefaultRate(_currentTenant.Settings);
        TaxPricingMode pricingMode = _taxCalculator.ResolvePricingMode(_currentTenant.Settings);
        List<LineItem> lineItems = QuoteLineItemFactory.CreateLineItems(
            request.LineItems.Select(item => (item.Description, item.Quantity, item.UnitPrice, item.TaxRate)),
            defaultTaxRate);

        Quote quote = Quote.CreateFromRfq(
            Guid.CreateVersion7(),
            rfq.ClientId,
            rfq.ProjectId,
            rfq.Id,
            request.QuoteNumber,
            lineItems,
            rfq.Currency,
            request.DueDate,
            request.Notes,
            pricingMode);

        try
        {
            rfq.MarkQuoted(quote.Id);
        }
        catch (InvalidOperationException)
        {
            return Result<QuoteDto>.Failure(RfqInvalidStateError);
        }

        _quoteRepository.Add(quote);
        _rfqRepository.Update(rfq);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<QuoteDto>.Success(QuoteMapping.Map(quote));
    }
}
