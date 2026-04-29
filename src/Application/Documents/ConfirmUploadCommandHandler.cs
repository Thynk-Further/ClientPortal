using Application.Abstractions;
using Application.Documents.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Documents;

public sealed class ConfirmUploadCommandHandler : IRequestHandler<ConfirmUploadCommand, Result>
{
    private static readonly Error DocumentNotFoundError = new(
        "Documents.NotFound",
        "Document was not found.",
        ErrorType.NotFound);

    private static readonly Error DocumentNotUploadingError = new(
        "Documents.NotUploading",
        "Only uploading documents can be confirmed.",
        ErrorType.Conflict);

    private readonly IDocumentRepository _documentRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ConfirmUploadCommandHandler(
        IDocumentRepository documentRepository,
        IUnitOfWork unitOfWork)
    {
        _documentRepository = documentRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(ConfirmUploadCommand request, CancellationToken cancellationToken)
    {
        Document? document = await _documentRepository.FindByIdAsync(request.DocumentId, cancellationToken);
        if (document is null || document.ClientId != request.ClientId)
        {
            return Result.Failure(DocumentNotFoundError);
        }

        if (document.Status != DocumentStatus.Uploading)
        {
            return Result.Failure(DocumentNotUploadingError);
        }

        document.MarkUploadConfirmed();
        _documentRepository.Update(document);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
