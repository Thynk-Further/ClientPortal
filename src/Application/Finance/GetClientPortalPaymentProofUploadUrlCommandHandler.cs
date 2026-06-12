using Application.Abstractions;
using Application.Clients.Abstractions;
using Application.Documents.Abstractions;
using Application.Finance.Dtos;
using Application.Invoices.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;
using Shared;

namespace Application.Finance;

public sealed class GetClientPortalPaymentProofUploadUrlCommandHandler
    : IRequestHandler<GetClientPortalPaymentProofUploadUrlCommand, Result<ClientPortalPaymentProofUploadUrlDto>>
{
    private static readonly Error InvoiceNotFoundError = new("Invoices.NotFound", "Invoice was not found.", ErrorType.NotFound);
    private static readonly Error UploadUrlGenerationFailedError = new(
        "Finance.PaymentProofUploadFailed",
        "Failed to generate payment proof upload URL.",
        ErrorType.Unexpected);

    private readonly ICurrentClientResolver _currentClientResolver;
    private readonly IInvoiceRepository _invoiceRepository;
    private readonly IDocumentRepository _documentRepository;
    private readonly IDocumentUploadUrlService _documentUploadUrlService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<GetClientPortalPaymentProofUploadUrlCommandHandler> _logger;

    public GetClientPortalPaymentProofUploadUrlCommandHandler(
        ICurrentClientResolver currentClientResolver,
        IInvoiceRepository invoiceRepository,
        IDocumentRepository documentRepository,
        IDocumentUploadUrlService documentUploadUrlService,
        IUnitOfWork unitOfWork,
        ILogger<GetClientPortalPaymentProofUploadUrlCommandHandler> logger)
    {
        _currentClientResolver = currentClientResolver;
        _invoiceRepository = invoiceRepository;
        _documentRepository = documentRepository;
        _documentUploadUrlService = documentUploadUrlService;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<ClientPortalPaymentProofUploadUrlDto>> Handle(
        GetClientPortalPaymentProofUploadUrlCommand request,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await _currentClientResolver.ResolveClientIdAsync(cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Result<ClientPortalPaymentProofUploadUrlDto>.Failure(clientIdResult.Errors);
        }

        Invoice? invoice = await _invoiceRepository.FindByIdAsync(request.InvoiceId, cancellationToken);
        if (invoice is null || invoice.ClientId != clientIdResult.Value)
        {
            return Result<ClientPortalPaymentProofUploadUrlDto>.Failure(InvoiceNotFoundError);
        }

        Guid documentId = Guid.CreateVersion7();
        DocumentUploadUrlIssueResult uploadResult;

        try
        {
            uploadResult = await _documentUploadUrlService.IssuePresignedPutUrlAsync(
                new DocumentUploadUrlRequest(
                    DocumentId: documentId,
                    ClientId: invoice.ClientId,
                    ProjectId: invoice.ProjectId,
                    Name: request.FileName,
                    Type: request.ContentType),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to issue payment proof upload URL for invoice {InvoiceId}.", invoice.Id);
            return Result<ClientPortalPaymentProofUploadUrlDto>.Failure(UploadUrlGenerationFailedError);
        }

        Document document = Document.Create(
            documentId,
            invoice.ClientId,
            invoice.ProjectId,
            request.FileName,
            request.ContentType,
            uploadResult.S3Key,
            currentVersion: 1,
            status: DocumentStatus.Uploading,
            tags: ["payment-proof"],
            uploadedBy: clientIdResult.Value);

        _documentRepository.Add(document);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<ClientPortalPaymentProofUploadUrlDto>.Success(
            new ClientPortalPaymentProofUploadUrlDto(document.Id, uploadResult.UploadUrl, uploadResult.ExpiresAtUtc));
    }
}
