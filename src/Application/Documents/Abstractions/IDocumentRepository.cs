using Application.Documents.Dtos;
using Domain;
using Shared;

namespace Application.Documents.Abstractions;

public interface IDocumentRepository
{
    Task<Document?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    Task<PagedResult<DocumentListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        string? type,
        Guid? projectId,
        Guid? clientId,
        DateTime? createdFromUtc,
        DateTime? createdToUtc,
        CancellationToken cancellationToken);

    void Add(Document document);

    void Update(Document document);
}
