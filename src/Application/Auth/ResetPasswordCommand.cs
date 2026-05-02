using Application.Abstractions;
using MediatR;
using Shared;

namespace Application.Auth;

public sealed record ResetPasswordCommand(string Token, string NewPassword)
    : IRequest<Result>, ITenantOptionalRequest;
