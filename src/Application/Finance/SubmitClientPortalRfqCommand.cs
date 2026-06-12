using MediatR;
using Shared;

namespace Application.Finance;

public sealed record SubmitClientPortalRfqCommand(Guid RfqId) : IRequest<Result>;
