using Domain;

namespace Application.Documents.Abstractions;

public interface IDocumentVersionRepository
{
    void Add(DocumentVersion documentVersion);
}
