using Api.Contracts;
using Api.Tenancy;
using Application.Notifications;
using Application.Notifications.Dtos;
using Domain;
using MediatR;
using Shared;
using System.Security.Claims;

namespace Api.Notifications;

public static class NotificationsEndpoints
{
    public static IEndpointRouteBuilder MapNotificationsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        RouteGroupBuilder group = endpoints.MapGroup("/api/v1/notifications")
            .WithTags("Notifications")
            .RequireTenant()
            .RequireAuthorization();

        group.MapGet("/", GetNotificationsAsync).WithName("NotificationsGet");
        group.MapPut("/{id:guid}/read", MarkReadAsync).WithName("NotificationsMarkRead");
        group.MapGet("/preferences", GetPreferencesAsync).WithName("NotificationsGetPreferences");
        group.MapPut("/preferences", UpdatePreferencesAsync).WithName("NotificationsUpdatePreferences");
        return endpoints;
    }

    private static async Task<IResult> GetNotificationsAsync(
        ClaimsPrincipal principal,
        int page,
        int pageSize,
        bool unreadOnly,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<PagedResult<InAppNotificationItemDto>> result = await sender.Send(
            new GetInAppNotificationsQuery(
                userIdResult.Value,
                page <= 0 ? 1 : page,
                pageSize <= 0 ? 20 : pageSize,
                unreadOnly),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> MarkReadAsync(
        Guid id,
        ClaimsPrincipal principal,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result result = await sender.Send(
            new MarkInAppNotificationReadCommand(id, userIdResult.Value),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> GetPreferencesAsync(
        ClaimsPrincipal principal,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<NotificationPreferencesDto> result = await sender.Send(
            new GetNotificationPreferencesQuery(userIdResult.Value),
            cancellationToken);

        return ToResponse(result);
    }

    private static async Task<IResult> UpdatePreferencesAsync(
        UpdateNotificationPreferencesRequest request,
        ClaimsPrincipal principal,
        ISender sender,
        CancellationToken cancellationToken)
    {
        Result<Guid> userIdResult = ResolveUserId(principal);
        if (userIdResult.IsFailed)
        {
            return Failure(userIdResult.Errors);
        }

        Result<NotificationPreferencesDto> result = await sender.Send(
            new UpdateNotificationPreferencesCommand(
                userIdResult.Value,
                request.EmailEnabled,
                request.WhatsAppEnabled,
                request.SmsEnabled,
                request.InAppEnabled,
                request.Frequency),
            cancellationToken);

        return ToResponse(result);
    }

    private static Result<Guid> ResolveUserId(ClaimsPrincipal principal)
    {
        string? userIdClaimValue = principal.FindFirstValue("userId");
        if (!Guid.TryParse(userIdClaimValue, out Guid userId))
        {
            return Result<Guid>.Failure(new Error(
                "Auth.InvalidUserContext",
                "Authenticated user context is invalid.",
                ErrorType.Forbidden));
        }

        return Result<Guid>.Success(userId);
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

    private sealed record UpdateNotificationPreferencesRequest(
        bool EmailEnabled,
        bool WhatsAppEnabled,
        bool SmsEnabled,
        bool InAppEnabled,
        NotificationPreferenceFrequency Frequency);
}
