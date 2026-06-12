using MediatR;
using Shared;

namespace Application.Clients;

public sealed record ChangeClientPortalPasswordCommand(
    string CurrentPassword,
    string NewPassword) : IRequest<Result>;
