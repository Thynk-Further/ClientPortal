using Application.Documents.Dtos;
using MediatR;
using Shared;

namespace Application.Documents;

public sealed record SendContractForSigningCommand(
    Guid ContractId,
    Guid ClientId) : IRequest<Result<SendContractForSigningResultDto>>;
