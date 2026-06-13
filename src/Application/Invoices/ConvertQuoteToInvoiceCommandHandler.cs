using Application.Abstractions;
using Application.Invoices.Abstractions;
using Application.Invoices.Dtos;
using Domain;
using MediatR;
using Shared;

namespace Application.Invoices;

public sealed class ConvertQuoteToInvoiceCommandHandler : IRequestHandler<ConvertQuoteToInvoiceCommand, Result<InvoiceDto>>
{
    private static readonly Error QuoteNotFoundError = new(
        "Quotes.NotFound",
        "Quote was not found.",
        ErrorType.NotFound);

    private static readonly Error QuoteNotAcceptedError = new(
        "Quotes.NotAccepted",
        "Only accepted quotes can be converted to invoices.",
        ErrorType.Conflict);

    private static readonly Error QuoteAlreadyConvertedError = new(
        "Quotes.AlreadyConverted",
        "Quote has already been converted to an invoice.",
        ErrorType.Conflict);

    private readonly IQuoteRepository _quoteRepository;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ConvertQuoteToInvoiceCommandHandler(
        IQuoteRepository quoteRepository,
        IInvoiceRepository invoiceRepository,
        IUnitOfWork unitOfWork)
    {
        _quoteRepository = quoteRepository;
        _invoiceRepository = invoiceRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<InvoiceDto>> Handle(ConvertQuoteToInvoiceCommand request, CancellationToken cancellationToken)
    {
        Quote? quote = await _quoteRepository.FindByIdAsync(request.QuoteId, cancellationToken);
        if (quote is null || !QuoteStaffAccess.MatchesClientScope(quote, request.ClientId))
        {
            return Result<InvoiceDto>.Failure(QuoteNotFoundError);
        }

        if (quote.Status != QuoteStatus.Accepted)
        {
            return Result<InvoiceDto>.Failure(QuoteNotAcceptedError);
        }

        if (quote.ConvertedInvoiceId.HasValue)
        {
            return Result<InvoiceDto>.Failure(QuoteAlreadyConvertedError);
        }

        if (!quote.ClientId.HasValue || !quote.ProjectId.HasValue)
        {
            return Result<InvoiceDto>.Failure(new Error(
                "Quotes.ExternalNotConvertible",
                "External quotations must be assigned to a portal client before invoicing.",
                ErrorType.Conflict));
        }

        Invoice invoice = Invoice.Create(
            id: Guid.CreateVersion7(),
            clientId: quote.ClientId.Value,
            projectId: quote.ProjectId.Value,
            invoiceNumber: request.InvoiceNumber,
            lineItems: quote.LineItems,
            currency: quote.Currency,
            dueDate: request.DueDate,
            notes: quote.Notes);

        quote.MarkConvertedToInvoice(invoice.Id);
        _invoiceRepository.Add(invoice);
        _quoteRepository.Update(quote);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<InvoiceDto>.Success(InvoiceMapping.Map(invoice));
    }
}
