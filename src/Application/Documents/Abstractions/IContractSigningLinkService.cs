using Domain;

namespace Application.Documents.Abstractions;

public interface IContractSigningLinkService
{
    Task<ContractSigningLinkIssueResult> IssueAsync(
        Contract contract,
        CancellationToken cancellationToken);
}
