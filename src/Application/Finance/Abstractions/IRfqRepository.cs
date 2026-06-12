using Application.Finance.Dtos;
using Domain;
using Shared;

namespace Application.Finance.Abstractions;

public interface IRfqRepository
{
    Task<PagedResult<RfqListItemDto>> GetPagedAsync(
        int page,
        int pageSize,
        RfqStatus? status,
        Guid? clientId,
        CancellationToken cancellationToken);

    Task<Rfq?> FindByIdAsync(Guid id, CancellationToken cancellationToken);

    void Add(Rfq rfq);

    void Update(Rfq rfq);
}
