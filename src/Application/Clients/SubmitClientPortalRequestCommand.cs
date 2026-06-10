using Domain;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record SubmitClientPortalRequestCommand(
    Guid ProjectId,
    string Title,
    string Description,
    ClientRequestPriority Priority = ClientRequestPriority.Medium) : IRequest<Result<Guid>>;
