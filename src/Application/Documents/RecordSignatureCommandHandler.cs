using Application.Abstractions;
using Application.Documents.Abstractions;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;
using Shared;

namespace Application.Documents;

public sealed class RecordSignatureCommandHandler : IRequestHandler<RecordSignatureCommand, Result>
{
    private static readonly Error ContractNotFoundError = new(
        "Contracts.NotFound",
        "Contract was not found.",
        ErrorType.NotFound);

    private static readonly Error ContractInvalidStateError = new(
        "Contracts.InvalidState",
        "Contract cannot be signed in its current state.",
        ErrorType.Conflict);

    private readonly IContractRepository _contractRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<RecordSignatureCommandHandler> _logger;

    public RecordSignatureCommandHandler(
        IContractRepository contractRepository,
        IUnitOfWork unitOfWork,
        ILogger<RecordSignatureCommandHandler> logger)
    {
        _contractRepository = contractRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(RecordSignatureCommand request, CancellationToken cancellationToken)
    {
        Contract? contract = await _contractRepository.FindByIdAsync(request.ContractId, cancellationToken);
        if (contract is null || contract.ClientId != request.ClientId)
        {
            return Result.Failure(ContractNotFoundError);
        }

        try
        {
            contract.MarkSigned(request.SignedAtUtc ?? DateTime.UtcNow);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid signature timestamp for contract {ContractId}.", contract.Id);
            return Result.Failure(ContractInvalidStateError);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid state transition while recording signature for contract {ContractId}.", contract.Id);
            return Result.Failure(ContractInvalidStateError);
        }

        _contractRepository.Update(contract);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
