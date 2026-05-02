using Application.Abstractions;
using Application.Auth.Dtos;
using MediatR;
using Shared;

namespace Application.Auth;

public sealed record LoginCommand(string Email, string Password)
    : IRequest<Result<AuthTokenDto>>, ITenantOptionalRequest;
