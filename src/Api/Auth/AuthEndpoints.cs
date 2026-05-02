using System.Net;
using Application.Auth;
using Application.Auth.Dtos;
using Application.Clients;
using Api.Contracts;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using Shared;

namespace Api.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        RouteGroupBuilder group = endpoints.MapGroup("/api/v1/auth")
            .WithTags("Auth");

        group.MapPost("/login", LoginAsync)
            .WithName("AuthLogin")
            .RequireRateLimiting(RateLimitPolicies.AuthLogin)
            .AllowAnonymous();

        group.MapPost("/refresh", RefreshAsync)
            .WithName("AuthRefresh");

        group.MapPost("/logout", LogoutAsync)
            .WithName("AuthLogout");

        group.MapPost("/register", RegisterAsync)
            .WithName("AuthRegister")
            .AllowAnonymous();

        group.MapPost("/forgot-password", ForgotPasswordAsync)
            .WithName("AuthForgotPassword");

        group.MapPost("/reset-password", ResetPasswordAsync)
            .WithName("AuthResetPassword");

        group.MapPost("/accept-invitation", AcceptInvitationAsync)
            .WithName("AuthAcceptInvitation")
            .AllowAnonymous();

        return endpoints;
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<AuthTokenDto> result = await sender.Send(
            new LoginCommand(request.Email, request.Password),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> RefreshAsync(
        HttpContext httpContext,
        IOptions<RefreshTokenCookieOptions> cookieOptions,
        ISender sender,
        CancellationToken cancellationToken)
    {
        if (!TryReadRefreshToken(httpContext, cookieOptions.Value.Name, out string refreshToken))
        {
            return MissingRefreshToken();
        }

        string clientIp = ResolveClientIp(httpContext);
        Result<AuthTokenDto> result = await sender.Send(
            new RefreshTokenCommand(refreshToken, clientIp),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> LogoutAsync(
        HttpContext httpContext,
        IOptions<RefreshTokenCookieOptions> cookieOptions,
        ISender sender,
        CancellationToken cancellationToken)
    {
        if (!TryReadRefreshToken(httpContext, cookieOptions.Value.Name, out string refreshToken))
        {
            return MissingRefreshToken();
        }

        Result result = await sender.Send(new LogoutCommand(refreshToken), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> RegisterAsync(
        RegisterBusinessRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<RegisterBusinessResultDto> result = await sender.Send(
            new RegisterBusinessCommand(
                request.CompanyName,
                request.CompanyDomain,
                request.OwnerFullName,
                request.OwnerEmail,
                request.OwnerPassword),
            cancellationToken);

        if (result.IsSuccess && result.Value is not null)
        {
            string location = $"/api/v1/tenants/{result.Value.TenantId}";
            return Results.Created(location, ApiResponse<RegisterBusinessResultDto>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> ForgotPasswordAsync(
        ForgotPasswordRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result result = await sender.Send(new ForgotPasswordCommand(request.Email), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> ResetPasswordAsync(
        ResetPasswordRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result result = await sender.Send(
            new ResetPasswordCommand(request.Token, request.NewPassword),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> AcceptInvitationAsync(
        AcceptInvitationRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result result = await sender.Send(
            new AcceptInvitationCommand(request.Token, request.Password),
            cancellationToken);
        return ToResponse(result);
    }

    private static IResult ToResponse(Result result)
    {
        if (result.IsSuccess)
        {
            return Results.Ok(ApiResponse<object?>.Ok(null));
        }

        return Failure(result.Errors);
    }

    private static IResult ToResponse<T>(Result<T> result)
    {
        if (result.IsSuccess && result.Value is not null)
        {
            return Results.Ok(ApiResponse<T>.Ok(result.Value));
        }

        return Failure(result.Errors);
    }

    private static IResult MissingRefreshToken()
    {
        ApiError[] errors =
        [
            new ApiError("Auth.MissingRefreshToken", "Refresh token cookie is missing.", ErrorType.Validation.ToString())
        ];

        return Results.BadRequest(ApiResponse<object?>.Fail(errors));
    }

    private static IResult Failure(IReadOnlyList<Error> errors)
    {
        ApiError[] apiErrors = errors
            .Select(error => new ApiError(error.Code, error.Message, error.Type.ToString()))
            .ToArray();

        int statusCode = errors.FirstOrDefault()?.Type switch
        {
            ErrorType.Validation => StatusCodes.Status400BadRequest,
            ErrorType.NotFound => StatusCodes.Status404NotFound,
            ErrorType.Conflict => StatusCodes.Status409Conflict,
            ErrorType.Forbidden => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status500InternalServerError
        };

        return Results.Json(ApiResponse<object?>.Fail(apiErrors), statusCode: statusCode);
    }

    private static bool TryReadRefreshToken(HttpContext httpContext, string cookieName, out string refreshToken)
    {
        refreshToken = string.Empty;
        if (string.IsNullOrWhiteSpace(cookieName))
        {
            return false;
        }

        if (!httpContext.Request.Cookies.TryGetValue(cookieName, out string? tokenValue)
            || string.IsNullOrWhiteSpace(tokenValue))
        {
            return false;
        }

        refreshToken = tokenValue;
        return true;
    }

    private static string ResolveClientIp(HttpContext httpContext)
    {
        return httpContext.Connection.RemoteIpAddress?.ToString() ?? IPAddress.Loopback.ToString();
    }
}

public sealed record LoginRequest(string Email, string Password);

public sealed record RegisterBusinessRequest(
    string CompanyName,
    string CompanyDomain,
    string OwnerFullName,
    string OwnerEmail,
    string OwnerPassword);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ResetPasswordRequest(string Token, string NewPassword);

public sealed record AcceptInvitationRequest(string Token, string Password);

public static class RateLimitPolicies
{
    public const string AuthLogin = "AuthLoginPolicy";
}
