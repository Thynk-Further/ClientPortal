using Application.Abstractions;
using Application.Documents.Abstractions;
using Application.Documents.Dtos;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;
using Shared;

namespace Application.Documents;

public sealed class GetUploadPresignedUrlCommandHandler : IRequestHandler<GetUploadPresignedUrlCommand, Result<GetUploadPresignedUrlResultDto>>
{
    private static readonly Error UploadUrlGenerationFailedError = new(
        "Documents.UploadUrlGenerationFailed",
        "Failed to generate a presigned upload URL.",
        ErrorType.Unexpected);

    private readonly IDocumentRepository _documentRepository;
    private readonly IDocumentUploadUrlService _documentUploadUrlService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<GetUploadPresignedUrlCommandHandler> _logger;

    public GetUploadPresignedUrlCommandHandler(
        IDocumentRepository documentRepository,
        IDocumentUploadUrlService documentUploadUrlService,
        IUnitOfWork unitOfWork,
        ILogger<GetUploadPresignedUrlCommandHandler> logger)
    {
        _documentRepository = documentRepository;
        _documentUploadUrlService = documentUploadUrlService;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<GetUploadPresignedUrlResultDto>> Handle(
        GetUploadPresignedUrlCommand request,
        CancellationToken cancellationToken)
    {
        Guid documentId = Guid.CreateVersion7();
        DocumentUploadUrlIssueResult uploadResult;

        try
        {
            uploadResult = await _documentUploadUrlService.IssuePresignedPutUrlAsync(
                new DocumentUploadUrlRequest(
                    DocumentId: documentId,
                    ClientId: request.ClientId,
                    ProjectId: request.ProjectId,
                    Name: request.Name,
                    Type: request.Type),
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to issue presigned upload URL for client {ClientId} and document {DocumentId}.",
                request.ClientId,
                documentId);

            return Result<GetUploadPresignedUrlResultDto>.Failure(UploadUrlGenerationFailedError);
        }

        Document document = Document.Create(
            id: documentId,
            clientId: request.ClientId,
            projectId: request.ProjectId,
            name: request.Name,
            type: request.Type,
            s3Key: uploadResult.S3Key,
            currentVersion: 1,
            status: DocumentStatus.Uploading,
            tags: request.Tags,
            uploadedBy: request.UploadedBy);

        _documentRepository.Add(document);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        GetUploadPresignedUrlResultDto result = new(
            DocumentId: document.Id,
            S3Key: uploadResult.S3Key,
            UploadUrl: uploadResult.UploadUrl,
            ExpiresAtUtc: uploadResult.ExpiresAtUtc);

        return Result<GetUploadPresignedUrlResultDto>.Success(result);
    }
}
