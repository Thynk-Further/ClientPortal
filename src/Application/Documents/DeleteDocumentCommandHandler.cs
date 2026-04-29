using Application.Abstractions;
using Application.Documents.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;
using Shared;

namespace Application.Documents;

public sealed class DeleteDocumentCommandHandler : IRequestHandler<DeleteDocumentCommand, Result>
{
    private static readonly Error DocumentNotFoundError = new(
        "Documents.NotFound",
        "Document was not found.",
        ErrorType.NotFound);

    private static readonly Error DocumentAccessRevocationFailedError = new(
        "Documents.AccessRevocationFailed",
        "Failed to revoke document access in storage policy.",
        ErrorType.Unexpected);

    private readonly IDocumentRepository _documentRepository;
    private readonly IDocumentAccessRevocationService _documentAccessRevocationService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteDocumentCommandHandler> _logger;

    public DeleteDocumentCommandHandler(
        IDocumentRepository documentRepository,
        IDocumentAccessRevocationService documentAccessRevocationService,
        IUnitOfWork unitOfWork,
        ILogger<DeleteDocumentCommandHandler> logger)
    {
        _documentRepository = documentRepository;
        _documentAccessRevocationService = documentAccessRevocationService;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(DeleteDocumentCommand request, CancellationToken cancellationToken)
    {
        Document? document = await _documentRepository.FindByIdAsync(request.DocumentId, cancellationToken);
        if (document is null || document.ClientId != request.ClientId)
        {
            return Result.Failure(DocumentNotFoundError);
        }

        try
        {
            await _documentAccessRevocationService.RevokeAsync(document, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to revoke storage access for document {DocumentId}.",
                document.Id);

            return Result.Failure(DocumentAccessRevocationFailedError);
        }

        document.SoftDelete();
        _documentRepository.Update(document);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
