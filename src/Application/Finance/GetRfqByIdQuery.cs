using Application.Finance.Dtos;
using MediatR;
using Shared;

namespace Application.Finance;

public sealed record GetRfqByIdQuery(Guid RfqId, Guid ClientId) : IRequest<Result<RfqDto>>;
