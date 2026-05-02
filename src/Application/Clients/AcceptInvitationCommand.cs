using Application.Abstractions;
using MediatR;
using Shared;

namespace Application.Clients;

public sealed record AcceptInvitationCommand(
    string Token,
    string Password) : IRequest<Result>, ITenantOptionalRequest;
