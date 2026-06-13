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
    private readonly IUnitOfWork _unitOfWork;

    public CreateExternalQuoteCommandHandler(IQuoteRepository quoteRepository, IUnitOfWork unitOfWork)
    {
        _quoteRepository = quoteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<QuoteDto>> Handle(CreateExternalQuoteCommand request, CancellationToken cancellationToken)
    {
        Quote quote = Quote.CreateForExternalRecipient(
            Guid.CreateVersion7(),
            request.QuoteNumber,
            request.LineItems.Select(item => new LineItem(item.Description, item.Quantity, item.UnitPrice, item.TaxRate)),
            request.Currency,
            request.DueDate,
            request.RecipientCompanyName,
            request.RecipientContactName,
            request.RecipientEmail,
            request.RecipientPhone,
            request.Notes);

        _quoteRepository.Add(quote);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<QuoteDto>.Success(QuoteMapping.Map(quote));
    }
}
