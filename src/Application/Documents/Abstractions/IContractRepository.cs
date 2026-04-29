using Domain;

namespace Application.Documents.Abstractions;

public interface IContractRepository
{
    Task<Contract?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    void Update(Contract contract);
}
