using Application.Abstractions;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class CreateExternalQuoteCommandHandler : IRequestHandler<CreateExternalQuoteCommand, Result<QuoteDto>>
{
    private readonly IQuoteRepository _quoteRepository;
    private readonly ICurrentTenant _currentTenant;
    private readonly ITaxCalculator _taxCalculator;
    private readonly IUnitOfWork _unitOfWork;

    public CreateExternalQuoteCommandHandler(
        IQuoteRepository quoteRepository,
        ICurrentTenant currentTenant,
        ITaxCalculator taxCalculator,
        IUnitOfWork unitOfWork)
    {
        _quoteRepository = quoteRepository;
        _currentTenant = currentTenant;
        _taxCalculator = taxCalculator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<QuoteDto>> Handle(CreateExternalQuoteCommand request, CancellationToken cancellationToken)
    {
        decimal defaultTaxRate = _taxCalculator.ResolveDefaultRate(_currentTenant.Settings);
        TaxPricingMode pricingMode = _taxCalculator.ResolvePricingMode(_currentTenant.Settings);
        List<LineItem> lineItems = QuoteLineItemFactory.CreateLineItems(
            request.LineItems.Select(item => (item.Description, item.Quantity, item.UnitPrice, item.TaxRate)),
            defaultTaxRate);

        Quote quote = Quote.CreateForExternalRecipient(
            Guid.CreateVersion7(),
            request.QuoteNumber,
            lineItems,
            request.Currency,
            request.DueDate,
            request.RecipientCompanyName,
            request.RecipientContactName,
            request.RecipientEmail,
            request.RecipientPhone,
            request.Notes,
            pricingMode);

        _quoteRepository.Add(quote);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<QuoteDto>.Success(QuoteMapping.Map(quote));
    }
}
