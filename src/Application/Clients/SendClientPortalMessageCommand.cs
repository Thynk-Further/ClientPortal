using MediatR;
using Shared;

namespace Application.Clients;

public sealed record SendClientPortalMessageCommand(
    Guid ThreadId,
    string ClientMessageId,
    string Content) : IRequest<Result<Guid>>;
