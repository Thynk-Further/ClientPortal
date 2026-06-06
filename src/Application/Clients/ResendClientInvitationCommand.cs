using MediatR;
using Shared;

namespace Application.Clients;

public sealed record ResendClientInvitationCommand(Guid ClientId) : IRequest<Result>;
