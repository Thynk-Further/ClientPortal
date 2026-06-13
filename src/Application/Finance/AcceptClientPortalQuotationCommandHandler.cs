using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Finance.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed class AcceptClientPortalQuotationCommandHandler
    : IRequestHandler<AcceptClientPortalQuotationCommand, Result>
{
    private static readonly Error QuotationNotFoundError = new("Quotes.NotFound", "Quotation was not found.", ErrorType.NotFound);
    private static readonly Error QuotationInvalidStateError = new("Quotes.InvalidState", "Quotation cannot be accepted in its current state.", ErrorType.Conflict);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IQuoteRepository _quoteRepository;
    private readonly IRfqRepository _rfqRepository;
    private readonly IPurchaseOrderRepository _purchaseOrderRepository;
    private readonly IUnitOfWork _unitOfWork;

    public AcceptClientPortalQuotationCommandHandler(
        ICurrentClientResolver currentClientResolver,
        IQuoteRepository quoteRepository,
        IRfqRepository rfqRepository,
        IPurchaseOrderRepository purchaseOrderRepository,
        IUnitOfWork unitOfWork)
    {
        _currentClientResolver = currentClientResolver;
        _quoteRepository = quoteRepository;
        _rfqRepository = rfqRepository;
        _purchaseOrderRepository = purchaseOrderRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(AcceptClientPortalQuotationCommand request, CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result.Failure(clientIdResult.Errors);
        }

        Quote? quote = await _quoteRepository.FindByIdAsync(request.QuotationId, cancellationToken);
        if (quote is null || quote.ClientId != clientIdResult.Value)
        {
            return Result.Failure(QuotationNotFoundError);
        }

        if (quote.Origin != QuoteOrigin.RfqResponse || !quote.RfqId.HasValue)
        {
            return Result.Failure(QuotationInvalidStateError);
        }

        Rfq? rfq = await _rfqRepository.FindByIdAsync(quote.RfqId.Value, cancellationToken);
        if (rfq is null)
        {
            return Result.Failure(QuotationNotFoundError);
        }

        try
        {
            quote.MarkAccepted();
            rfq.MarkAccepted();
        }
        catch (InvalidOperationException)
        {
            return Result.Failure(QuotationInvalidStateError);
        }

        PurchaseOrder purchaseOrder = PurchaseOrder.CreateFromQuotation(
            Guid.CreateVersion7(),
            quote.ClientId!.Value,
            quote.ProjectId!.Value,
            $"PO-{quote.QuoteNumber}",
            quote.Id,
            quote.RfqId.Value,
            quote.LineItems,
            quote.Currency,
            quote.Notes);

        quote.LinkPurchaseOrder(purchaseOrder.Id);

        _purchaseOrderRepository.Add(purchaseOrder);
        _quoteRepository.Update(quote);
        _rfqRepository.Update(rfq);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
