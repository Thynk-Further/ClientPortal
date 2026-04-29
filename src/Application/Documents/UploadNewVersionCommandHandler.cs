using Application.Abstractions;
using Application.Documents.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Documents;

public sealed class UploadNewVersionCommandHandler : IRequestHandler<UploadNewVersionCommand, Result<int>>
{
    private static readonly Error DocumentNotFoundError = new(
        "Documents.NotFound",
        "Document was not found.",
        ErrorType.NotFound);

    private static readonly Error DocumentDeletedError = new(
        "Documents.Deleted",
        "Deleted documents cannot accept new versions.",
        ErrorType.Conflict);

    private readonly IDocumentRepository _documentRepository;
    private readonly IDocumentVersionRepository _documentVersionRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UploadNewVersionCommandHandler(
        IDocumentRepository documentRepository,
        IDocumentVersionRepository documentVersionRepository,
        IUnitOfWork unitOfWork)
    {
        _documentRepository = documentRepository;
        _documentVersionRepository = documentVersionRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<int>> Handle(UploadNewVersionCommand request, CancellationToken cancellationToken)
    {
        Document? document = await _documentRepository.FindByIdAsync(request.DocumentId, cancellationToken);
        if (document is null || document.ClientId != request.ClientId)
        {
            return Result<int>.Failure(DocumentNotFoundError);
        }

        if (document.Status == DocumentStatus.Deleted)
        {
            return Result<int>.Failure(DocumentDeletedError);
        }

        int nextVersion = document.IncrementVersion();
        document.ReplaceS3Key(request.S3Key);

        DocumentVersion documentVersion = DocumentVersion.Create(
            id: Guid.CreateVersion7(),
            documentId: document.Id,
            versionNumber: nextVersion,
            s3Key: request.S3Key,
            uploadedAtUtc: request.UploadedAtUtc ?? DateTime.UtcNow,
            uploadedBy: request.UploadedBy,
            changeNotes: request.ChangeNotes);

        _documentVersionRepository.Add(documentVersion);
        _documentRepository.Update(document);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result<int>.Success(nextVersion);
    }
}
