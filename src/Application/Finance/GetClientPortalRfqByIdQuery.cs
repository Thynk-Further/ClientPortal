using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetClientPortalRfqByIdQuery(Guid RfqId) : IRequest<Result<RfqDto>>;
