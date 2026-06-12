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
        return Result<QuoteDto>.Success(QuoteMapping.Map(quote));
    }
}
