using Application.Abstractions;
using Application.Auth.Dtos;
using MediatR;
using Shared;

namespace Application.Auth;

public sealed record RefreshTokenCommand(string RefreshToken, string ClientIp)
    : IRequest<Result<AuthTokenDto>>, ITenantOptionalRequest;
