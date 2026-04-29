using MediatR;
using Shared;

namespace Application.Documents;

public sealed record DeleteDocumentCommand(
    Guid DocumentId,
    Guid ClientId) : IRequest<Result>;
