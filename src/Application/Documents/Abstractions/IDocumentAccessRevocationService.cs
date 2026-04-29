using Domain;

namespace Application.Documents.Abstractions;

public interface IDocumentAccessRevocationService
{
    Task RevokeAsync(Document document, CancellationToken cancellationToken);
}
