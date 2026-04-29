using MediatR;
using Shared;

namespace Application.Documents;

public sealed record RecordSignatureCommand(
    Guid ContractId,
    Guid ClientId,
    DateTime? SignedAtUtc = null) : IRequest<Result>;
