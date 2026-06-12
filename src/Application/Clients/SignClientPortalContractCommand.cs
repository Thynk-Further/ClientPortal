using MediatR;
using Shared;

namespace Application.Clients;

public sealed record SignClientPortalContractCommand(
    Guid ContractId,
    string SignerName) : IRequest<Result>;
