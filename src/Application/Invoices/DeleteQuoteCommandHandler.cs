using Application.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class DeleteQuoteCommandHandler : IRequestHandler<DeleteQuoteCommand, Result>
{
    private static readonly Error QuoteNotFoundError = new("Quotes.NotFound", "Quote was not found.", ErrorType.NotFound);

    private readonly IQuoteRepository _quoteRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteQuoteCommandHandler(IQuoteRepository quoteRepository, IUnitOfWork unitOfWork)
    {
        _quoteRepository = quoteRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteQuoteCommand request, CancellationToken cancellationToken)
    {
        Quote? quote = await _quoteRepository.FindByIdAsync(request.QuoteId, cancellationToken);
        if (quote is null || quote.ClientId != request.ClientId)
        {
            return Result.Failure(QuoteNotFoundError);
        }

        _quoteRepository.Delete(quote);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
