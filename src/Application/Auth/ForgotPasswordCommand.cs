using Application.Abstractions;
using MediatR;
using Shared;

namespace Application.Auth;

public sealed record ForgotPasswordCommand(string Email) : IRequest<Result>, ITenantOptionalRequest;
