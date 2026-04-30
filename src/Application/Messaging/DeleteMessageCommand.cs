using MediatR;
using Shared;

namespace Application.Messaging;

public sealed record DeleteMessageCommand(
    Guid ThreadId,
    Guid MessageId,
    Guid ActorId,
    string Reason,
    bool IsModerationAction = false) : IRequest<Result>;
