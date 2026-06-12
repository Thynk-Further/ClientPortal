using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record CreateClientPortalRfqLineItemInput(string Description, decimal Quantity);

public sealed record CreateClientPortalRfqCommand(
    Guid ProjectId,
    string RfqNumber,
    string Currency,
    IReadOnlyCollection<CreateClientPortalRfqLineItemInput> LineItems,
    string? Notes = null) : IRequest<Result<RfqDto>>;
