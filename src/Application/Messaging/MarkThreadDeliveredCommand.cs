using MediatR;
using Shared;

namespace Application.Messaging;

public sealed record MarkThreadDeliveredCommand(
    Guid ThreadId,
    Guid RecipientId) : IRequest<Result<int>>;
