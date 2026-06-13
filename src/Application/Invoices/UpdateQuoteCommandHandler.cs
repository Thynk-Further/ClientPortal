using Application.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class UpdateQuoteCommandHandler : IRequestHandler<UpdateQuoteCommand, Result>
{
    private static readonly Error QuoteNotFoundError = new("Quotes.NotFound", "Quote was not found.", ErrorType.NotFound);
    private static readonly Error QuoteNotDraftError = new("Quotes.NotDraft", "Only draft quotes can be updated.", ErrorType.Conflict);

    private readonly IQuoteRepository _quoteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateQuoteCommandHandler(IQuoteRepository quoteRepository, IUnitOfWork unitOfWork)
    {
        _quoteRepository = quoteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateQuoteCommand request, CancellationToken cancellationToken)
    {
        Quote? quote = await _quoteRepository.FindByIdAsync(request.QuoteId, cancellationToken);
        if (quote is null || !QuoteStaffAccess.MatchesClientScope(quote, request.ClientId))
        {
            return Result.Failure(QuoteNotFoundError);
        }

        if (quote.Status != QuoteStatus.Draft)
        {
            return Result.Failure(QuoteNotDraftError);
        }

        quote.ReplaceLineItems(request.LineItems.Select(item => new LineItem(item.Description, item.Quantity, item.UnitPrice, item.TaxRate)));
        quote.UpdateQuoteNumber(request.QuoteNumber);
        quote.UpdateCurrency(request.Currency);
        quote.SetDueDate(request.DueDate);
        quote.UpdateNotes(request.Notes);

        if (quote.Origin == QuoteOrigin.ExternalOffPlatform)
        {
            if (string.IsNullOrWhiteSpace(request.RecipientCompanyName))
            {
                return Result.Failure(new Error(
                    "Quotes.RecipientRequired",
                    "Recipient company name is required.",
                    ErrorType.Validation));
            }

            quote.UpdateExternalRecipient(
                request.RecipientCompanyName,
                request.RecipientContactName,
                request.RecipientEmail,
                request.RecipientPhone);
        }

        _quoteRepository.Update(quote);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
