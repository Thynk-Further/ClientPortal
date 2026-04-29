using MediatR;
using Shared;

namespace Application.Documents;

public sealed record UpdateDocumentCommand(
    Guid DocumentId,
    Guid ClientId,
    string Name,
    Guid? ProjectId,
    IReadOnlyCollection<string>? Tags) : IRequest<Result>;
