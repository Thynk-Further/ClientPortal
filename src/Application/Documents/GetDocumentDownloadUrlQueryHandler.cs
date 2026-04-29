using Application.Documents.Abstractions;
using Application.Documents.Dtos;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;
using Shared;

namespace Application.Documents;

public sealed class GetDocumentDownloadUrlQueryHandler : IRequestHandler<GetDocumentDownloadUrlQuery, Result<GetDocumentDownloadUrlResultDto>>
{
    private static readonly Error DocumentNotFoundError = new(
        "Documents.NotFound",
        "Document was not found.",
        ErrorType.NotFound);

    private static readonly Error DocumentDeletedError = new(
        "Documents.Deleted",
        "Deleted documents cannot be downloaded.",
        ErrorType.Conflict);

    private static readonly Error DownloadUrlGenerationFailedError = new(
        "Documents.DownloadUrlGenerationFailed",
        "Failed to generate a presigned download URL.",
        ErrorType.Unexpected);

    private static readonly TimeSpan DownloadUrlExpiry = TimeSpan.FromMinutes(15);

    private readonly IDocumentRepository _documentRepository;
    private readonly IDocumentDownloadUrlService _documentDownloadUrlService;
    private readonly ILogger<GetDocumentDownloadUrlQueryHandler> _logger;

    public GetDocumentDownloadUrlQueryHandler(
        IDocumentRepository documentRepository,
        IDocumentDownloadUrlService documentDownloadUrlService,
        ILogger<GetDocumentDownloadUrlQueryHandler> logger)
    {
        _documentRepository = documentRepository;
        _documentDownloadUrlService = documentDownloadUrlService;
        _logger = logger;
    }

    public async Task<Result<GetDocumentDownloadUrlResultDto>> Handle(
        GetDocumentDownloadUrlQuery request,
        CancellationToken cancellationToken)
    {
        Document? document = await _documentRepository.FindByIdAsync(request.DocumentId, cancellationToken);
        if (document is null || document.ClientId != request.ClientId)
        {
            return Result<GetDocumentDownloadUrlResultDto>.Failure(DocumentNotFoundError);
        }

        if (document.Status == DocumentStatus.Deleted)
        {
            return Result<GetDocumentDownloadUrlResultDto>.Failure(DocumentDeletedError);
        }

        try
        {
            DocumentDownloadUrlIssueResult issueResult = await _documentDownloadUrlService.IssuePresignedGetUrlAsync(
                document,
                DownloadUrlExpiry,
                cancellationToken);

            GetDocumentDownloadUrlResultDto result = new(
                DocumentId: document.Id,
                DownloadUrl: issueResult.DownloadUrl,
                ExpiresAtUtc: issueResult.ExpiresAtUtc);

            return Result<GetDocumentDownloadUrlResultDto>.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to issue download URL for document {DocumentId}.",
                request.DocumentId);

            return Result<GetDocumentDownloadUrlResultDto>.Failure(DownloadUrlGenerationFailedError);
        }
    }
}
