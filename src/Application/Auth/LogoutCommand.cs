using Application.Abstractions;
using MediatR;
using Shared;

namespace Application.Auth;

public sealed record LogoutCommand(string RefreshToken) : IRequest<Result>, ITenantOptionalRequest;
