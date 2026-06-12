using Application.Abstractions;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;
using Shared;

namespace Application.Invoices;

public sealed class SendQuoteCommandHandler : IRequestHandler<SendQuoteCommand, Result>
{
    private static readonly Error QuoteNotFoundError = new("Quotes.NotFound", "Quote was not found.", ErrorType.NotFound);
    private static readonly Error QuoteInvalidStateError = new("Quotes.InvalidState", "Quote cannot be sent in its current state.", ErrorType.Conflict);

    private readonly IQuoteRepository _quoteRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SendQuoteCommandHandler> _logger;

    public SendQuoteCommandHandler(
        IQuoteRepository quoteRepository,
        IUnitOfWork unitOfWork,
        ILogger<SendQuoteCommandHandler> logger)
    {
        _quoteRepository = quoteRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(SendQuoteCommand request, CancellationToken cancellationToken)
    {
        Quote? quote = await _quoteRepository.FindByIdAsync(request.QuoteId, cancellationToken);
        if (quote is null || quote.ClientId != request.ClientId)
        {
            return Result.Failure(QuoteNotFoundError);
        }

        try
        {
            quote.MarkSent();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid state transition while sending quote {QuoteId}.", quote.Id);
            return Result.Failure(QuoteInvalidStateError);
        }

        _quoteRepository.Update(quote);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
