namespace Application.Documents.Dtos;

public sealed record SendContractForSigningResultDto(
    Guid ContractId,
    string SigningUrl,
    DateTime ExpiresAtUtc);
