using Application.Abstractions;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class CreateQuoteCommandHandler : IRequestHandler<CreateQuoteCommand, Result<QuoteDto>>
{
    private readonly IQuoteRepository _quoteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CreateQuoteCommandHandler(IQuoteRepository quoteRepository, IUnitOfWork unitOfWork)
    {
        _quoteRepository = quoteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<QuoteDto>> Handle(CreateQuoteCommand request, CancellationToken cancellationToken)
    {
        Quote quote = Quote.Create(
            Guid.CreateVersion7(),
            request.ClientId,
            request.ProjectId,
            request.QuoteNumber,
            request.LineItems.Select(item => new LineItem(item.Description, item.Quantity, item.UnitPrice, item.TaxRate)),
            request.Currency,
            request.DueDate,
            request.Notes);

        _quoteRepository.Add(quote);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result<QuoteDto>.Success(Map(quote));
    }

    internal static QuoteDto Map(Quote quote)
    {
        IReadOnlyCollection<InvoiceLineItemDto> lineItems = quote.LineItems
            .Select(lineItem => new InvoiceLineItemDto(lineItem.Description, lineItem.Quantity, lineItem.UnitPrice, lineItem.TaxRate, lineItem.Amount))
            .ToList()
            .AsReadOnly();

        return new QuoteDto(
            quote.Id,
            quote.ClientId,
            quote.ProjectId,
            quote.QuoteNumber,
            quote.Status,
            lineItems,
            quote.Subtotal,
            quote.TaxAmount,
            quote.Total,
            quote.Currency,
            quote.DueDate,
            quote.Notes,
            quote.ConvertedInvoiceId,
            quote.CreatedAt,
            quote.UpdatedAt);
    }
}
