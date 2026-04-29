using Application.Abstractions;
using Application.Documents.Abstractions;
using Domain;
using MediatR;
using Shared;

namespace Application.Documents;

public sealed class UpdateDocumentCommandHandler : IRequestHandler<UpdateDocumentCommand, Result>
{
    private static readonly Error DocumentNotFoundError = new(
        "Documents.NotFound",
        "Document was not found.",
        ErrorType.NotFound);

    private readonly IDocumentRepository _documentRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateDocumentCommandHandler(
        IDocumentRepository documentRepository,
        IUnitOfWork unitOfWork)
    {
        _documentRepository = documentRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(UpdateDocumentCommand request, CancellationToken cancellationToken)
    {
        Document? document = await _documentRepository.FindByIdAsync(request.DocumentId, cancellationToken);
        if (document is null || document.ClientId != request.ClientId)
        {
            return Result.Failure(DocumentNotFoundError);
        }

        document.Rename(request.Name);
        document.AssignToProject(request.ProjectId);
        document.ReplaceTags(request.Tags);

        _documentRepository.Update(document);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
