using Application.Clients;
using Application.Clients.Dtos;
using Application.Auth.Abstractions;
using Api.Auth;
using Api.Contracts;
using Api.Tenancy;
using Domain;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using System.Security.Claims;
using Shared;

namespace Api.Clients;

public static class ClientsEndpoints
{
    public static IEndpointRouteBuilder MapClientsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        ArgumentNullException.ThrowIfNull(endpoints);

        RouteGroupBuilder group = endpoints.MapGroup("/api/v1/clients")
            .WithTags("Clients")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireAnyStaff);

        group.MapGet("/", GetClientsAsync)
            .WithName("ClientsGet");

        group.MapGet("/{id:guid}", GetClientByIdAsync)
            .WithName("ClientsGetById");

        group.MapPost("/invite", InviteClientAsync)
            .WithName("ClientsInvite");

        group.MapPut("/{id:guid}", UpdateClientAsync)
            .WithName("ClientsUpdate");

        group.MapPost("/{id:guid}/deactivate", DeactivateClientAsync)
            .WithName("ClientsDeactivate");

        RouteGroupBuilder portalGroup = endpoints.MapGroup("/api/v1/client-portal")
            .WithTags("Client Portal")
            .RequireTenant()
            .RequireAuthorization(AuthorizationPolicies.RequireClientUser);

        portalGroup.MapGet("/onboarding-status", GetOnboardingStatusAsync)
            .WithName("ClientPortalOnboardingStatus");

        portalGroup.MapPost("/onboarding-steps/{stepKey}/complete", CompleteOnboardingStepAsync)
            .WithName("ClientPortalCompleteOnboardingStep");

        return endpoints;
    }

    private static async Task<IResult> GetClientsAsync(
        int page,
        int pageSize,
        string? search,
        ClientStatus? status,
        ISender sender,
        CancellationToken cancellationToken)
    {
        int normalizedPage = page <= 0 ? 1 : page;
        int normalizedPageSize = pageSize <= 0 ? 20 : pageSize;
        Result<PagedResult<ClientListItemDto>> result = await sender.Send(
            new GetClientsQuery(normalizedPage, normalizedPageSize, search, status),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> GetClientByIdAsync(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<ClientDetailDto> result = await sender.Send(new GetClientByIdQuery(id), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> InviteClientAsync(
        InviteClientRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<InviteClientResultDto> result = await sender.Send(
            new InviteClientCommand(
                request.CompanyName,
                request.ContactName,
                request.Email,
                request.Phone,
                request.Notes),
            cancellationToken);

        if (result.IsSuccess && result.Value is not null)
        {
            string location = $"/api/v1/clients/{result.Value.ClientId}";
            return Results.Created(location, ApiResponse<InviteClientResultDto>.Ok(result.Value));
        }

        return ToResponse(result);
    }

    private static async Task<IResult> UpdateClientAsync(
        Guid id,
        UpdateClientRequest request,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result result = await sender.Send(
            new UpdateClientCommand(
                id,
                request.CompanyName,
                request.ContactName,
                request.Email,
                request.Phone,
                request.Notes,
                request.Status),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> DeactivateClientAsync(
        Guid id,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result result = await sender.Send(new DeactivateClientCommand(id), cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> GetOnboardingStatusAsync(
        ClaimsPrincipal principal,
        IUserAuthenticationRepository userAuthenticationRepository,
        Application.Clients.Abstractions.IClientRepository clientRepository,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await ResolveCurrentClientIdAsync(
            principal,
            userAuthenticationRepository,
            clientRepository,
            cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Failure(clientIdResult.Errors);
        }

        Result<OnboardingStatusDto> result = await sender.Send(
            new GetOnboardingStatusQuery(clientIdResult.Value),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<IResult> CompleteOnboardingStepAsync(
        string stepKey,
        ClaimsPrincipal principal,
        IUserAuthenticationRepository userAuthenticationRepository,
        Application.Clients.Abstractions.IClientRepository clientRepository,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> clientIdResult = await ResolveCurrentClientIdAsync(
            principal,
            userAuthenticationRepository,
            clientRepository,
            cancellationToken);
        if (clientIdResult.IsFailed)
        {
            return Failure(clientIdResult.Errors);
        }

        Result result = await sender.Send(
            new CompleteOnboardingStepCommand(clientIdResult.Value, stepKey),
            cancellationToken);
        return ToResponse(result);
    }

    private static async Task<Result<Guid>> ResolveCurrentClientIdAsync(
        ClaimsPrincipal principal,
        IUserAuthenticationRepository userAuthenticationRepository,
        Application.Clients.Abstractions.IClientRepository clientRepository,
        CancellationToken cancellationToken)
    {
        string? userIdClaimValue = principal.FindFirstValue("userId");
        if (!Guid.TryParse(userIdClaimValue, out Guid userId))
        {
            return Result<Guid>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        User? user = await userAuthenticationRepository.FindByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return Result<Guid>.Failure(new Error(
                "Auth.UserNotFound",
                "Authenticated user was not found.",
                ErrorType.Forbidden));
        }

        Client? client = await clientRepository.GetByEmailAsync(user.Email, cancellationToken);
        if (client is null)
        {
            return Result<Guid>.Failure(new Error(
                "Clients.NotFound",
                "Client record for the authenticated user was not found.",
                ErrorType.NotFound));
        }

        return Result<Guid>.Success(client.Id);
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
}

public sealed record InviteClientRequest(
    string CompanyName,
    string ContactName,
    string Email,
    string Phone,
    string? Notes);

public sealed record UpdateClientRequest(
    string CompanyName,
    string ContactName,
    string Email,
    string Phone,
    string? Notes,
    ClientStatus Status);
