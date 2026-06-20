using MediatR;
using Shared;

namespace Application.Team;

public sealed record AcceptStaffInvitationCommand(
    string Token,
    string Password) : IRequest<Result>;
