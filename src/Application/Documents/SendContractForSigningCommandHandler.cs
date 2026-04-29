using Application.Abstractions;
using Application.Documents.Abstractions;
using Application.Documents.Dtos;
using Domain;
using MediatR;
using Microsoft.Extensions.Logging;
using Shared;

namespace Application.Documents;

public sealed class SendContractForSigningCommandHandler
    : IRequestHandler<SendContractForSigningCommand, Result<SendContractForSigningResultDto>>
{
    private static readonly Error ContractNotFoundError = new(
        "Contracts.NotFound",
        "Contract was not found.",
        ErrorType.NotFound);

    private static readonly Error ContractInvalidStateError = new(
        "Contracts.InvalidState",
        "Contract cannot be sent for signing in its current state.",
        ErrorType.Conflict);

    private static readonly Error SigningLinkGenerationFailedError = new(
        "Contracts.SigningLinkGenerationFailed",
        "Failed to generate the contract signing link.",
        ErrorType.Unexpected);

    private static readonly Error ContractNotificationFailedError = new(
        "Contracts.NotificationFailed",
        "Contract was sent for signing but notifying the client failed.",
        ErrorType.Unexpected);

    private readonly IContractRepository _contractRepository;
    private readonly IContractSigningLinkService _contractSigningLinkService;
    private readonly IContractNotificationService _contractNotificationService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SendContractForSigningCommandHandler> _logger;

    public SendContractForSigningCommandHandler(
        IContractRepository contractRepository,
        IContractSigningLinkService contractSigningLinkService,
        IContractNotificationService contractNotificationService,
        IUnitOfWork unitOfWork,
        ILogger<SendContractForSigningCommandHandler> logger)
    {
        _contractRepository = contractRepository;
        _contractSigningLinkService = contractSigningLinkService;
        _contractNotificationService = contractNotificationService;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<SendContractForSigningResultDto>> Handle(
        SendContractForSigningCommand request,
        CancellationToken cancellationToken)
    {
        Contract? contract = await _contractRepository.FindByIdAsync(request.ContractId, cancellationToken);
        if (contract is null || contract.ClientId != request.ClientId)
        {
            return Result<SendContractForSigningResultDto>.Failure(ContractNotFoundError);
        }

        ContractSigningLinkIssueResult signingLink;
        try
        {
            signingLink = await _contractSigningLinkService.IssueAsync(contract, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate signing link for contract {ContractId}.", contract.Id);
            return Result<SendContractForSigningResultDto>.Failure(SigningLinkGenerationFailedError);
        }

        try
        {
            contract.SendForSigning();
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid state transition while sending contract {ContractId} for signing.", contract.Id);
            return Result<SendContractForSigningResultDto>.Failure(ContractInvalidStateError);
        }

        _contractRepository.Update(contract);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await _contractNotificationService.NotifySentForSigningAsync(
                contract,
                signingLink.SigningUrl,
                signingLink.ExpiresAtUtc,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to notify client for contract {ContractId}.", contract.Id);
            return Result<SendContractForSigningResultDto>.Failure(ContractNotificationFailedError);
        }

        SendContractForSigningResultDto result = new(
            ContractId: contract.Id,
            SigningUrl: signingLink.SigningUrl,
            ExpiresAtUtc: signingLink.ExpiresAtUtc);

        return Result<SendContractForSigningResultDto>.Success(result);
    }
}
