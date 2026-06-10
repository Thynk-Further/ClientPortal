using MediatR;
using Shared;

namespace Application.Clients;

public sealed record MarkClientPortalThreadReadCommand(Guid ThreadId) : IRequest<Result<int>>;
