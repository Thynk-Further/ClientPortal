using MediatR;
using Shared;

namespace Application.Documents;

public sealed record ConfirmUploadCommand(
    Guid DocumentId,
    Guid ClientId) : IRequest<Result>;
